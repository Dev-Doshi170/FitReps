/**
 * Applies progressive-overload logic server-side and persists `progression_state`.
 * Update `supabase/functions/_shared/progressionEngine.ts` to change rules without app releases.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

import {
  analyzeProgressionSession,
  mapEquipmentStringToType,
  type ProgressionState,
  type SetLog,
} from '../_shared/progressionEngine.ts';
import { parsePlanRepsString } from '../_shared/repRange.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ProgressionRow = {
  exercise_name: string;
  current_weight: number | null;
  current_reps_target: number | null;
  rep_range_min: number;
  rep_range_max: number;
  consecutive_hard_sets: number | null;
  consecutive_easy_sessions: number | null;
  last_session_rpe: string | null;
};

function rowToState(row: ProgressionRow): ProgressionState {
  const last = row.last_session_rpe;
  const lastRpe =
    last === 'easy' || last === 'medium' || last === 'hard' ? last : null;
  return {
    exerciseName: row.exercise_name,
    currentWeight: row.current_weight != null ? Number(row.current_weight) : null,
    currentRepsTarget: row.current_reps_target ?? row.rep_range_min,
    repRangeMin: row.rep_range_min,
    repRangeMax: row.rep_range_max,
    consecutiveHardSets: row.consecutive_hard_sets ?? 0,
    consecutiveEasySessions: row.consecutive_easy_sessions ?? 0,
    lastSessionRpe: lastRpe,
  };
}

function defaultState(exerciseName: string, repMin: number, repMax: number): ProgressionState {
  return {
    exerciseName,
    currentWeight: null,
    currentRepsTarget: repMin,
    repRangeMin: repMin,
    repRangeMax: repMax,
    consecutiveHardSets: 0,
    consecutiveEasySessions: 0,
    lastSessionRpe: null,
  };
}

function normalizeRpe(r: string | null | undefined): SetLog['rpe'] {
  if (r === 'easy' || r === 'medium' || r === 'hard') {
    return r;
  }
  return null;
}

function parseBodySets(raw: unknown): SetLog[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: SetLog[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') {
      return null;
    }
    const o = item as Record<string, unknown>;
    const setNumber = Number(o.setNumber);
    const reps = Number(o.reps);
    if (!Number.isFinite(setNumber) || !Number.isFinite(reps)) {
      return null;
    }
    const weight =
      o.weight === null || o.weight === undefined
        ? null
        : Number(o.weight);
    if (o.weight !== null && o.weight !== undefined && !Number.isFinite(weight)) {
      return null;
    }
    out.push({
      setNumber,
      reps,
      weight,
      rpe: normalizeRpe(
        typeof o.rpe === 'string' || o.rpe === null ? (o.rpe as string | null) : null,
      ),
    });
  }
  return out;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(jwt);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const b = bodyJson as Record<string, unknown>;
  const exerciseName = typeof b.exercise_name === 'string' ? b.exercise_name.trim() : '';
  const equipment = typeof b.equipment === 'string' ? b.equipment : '';
  const repRange = typeof b.rep_range === 'string' ? b.rep_range : '';
  if (!exerciseName || !equipment || !repRange) {
    return new Response(
      JSON.stringify({ error: 'exercise_name, equipment, and rep_range are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const sets = parseBodySets(b.sets);
  if (sets == null) {
    return new Response(JSON.stringify({ error: 'sets must be an array of set objects' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const machineInc =
    typeof b.machineIncrementKg === 'number' && Number.isFinite(b.machineIncrementKg)
      ? b.machineIncrementKg
      : undefined;

  const { min: repMin, max: repMax } = parsePlanRepsString(repRange);

  const { data: row, error: fetchErr } = await supabase
    .from('progression_state')
    .select(
      'exercise_name, current_weight, current_reps_target, rep_range_min, rep_range_max, consecutive_hard_sets, consecutive_easy_sessions, last_session_rpe',
    )
    .eq('user_id', user.id)
    .eq('exercise_name', exerciseName)
    .maybeSingle();

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let baseState: ProgressionState;
  if (row) {
    baseState = rowToState(row as ProgressionRow);
    baseState = {
      ...baseState,
      exerciseName,
      repRangeMin: repMin,
      repRangeMax: repMax,
    };
  } else {
    baseState = defaultState(exerciseName, repMin, repMax);
  }

  const equipmentType = mapEquipmentStringToType(equipment);
  const { recommendation, nextState } = analyzeProgressionSession(baseState, sets, equipmentType, {
    machineIncrementKg: machineInc,
  });

  const { error: upsertErr } = await supabase.from('progression_state').upsert(
    {
      user_id: user.id,
      exercise_name: exerciseName,
      current_weight: nextState.currentWeight,
      current_reps_target: nextState.currentRepsTarget,
      rep_range_min: nextState.repRangeMin,
      rep_range_max: nextState.repRangeMax,
      consecutive_hard_sets: nextState.consecutiveHardSets,
      consecutive_easy_sessions: nextState.consecutiveEasySessions,
      last_session_rpe: nextState.lastSessionRpe,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'user_id,exercise_name' },
  );

  if (upsertErr) {
    return new Response(JSON.stringify({ error: upsertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      recommendation,
      progression: { ...nextState, exerciseName },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
