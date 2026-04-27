import type { GymExperience } from '../lib/initialLoadSuggestion';
import { localDateKey } from '../lib/localDateKey';
import { supabase } from './supabase';

export type UserProfile = {
  height_inches: number;
  body_weight_kg: number;
  experience: GymExperience;
  onboarding_complete: boolean;
};

export async function fetchUserProfileRow(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('height_inches, body_weight_kg, experience, onboarding_complete')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    return null;
  }
  const r = data as {
    height_inches: string | number;
    body_weight_kg: string | number;
    experience: string;
    onboarding_complete: boolean;
  };
  return {
    height_inches: Number(r.height_inches),
    body_weight_kg: Number(r.body_weight_kg),
    experience: r.experience as GymExperience,
    onboarding_complete: r.onboarding_complete,
  };
}

export async function saveOnboardingProfile(args: {
  userId: string;
  heightInches: number;
  bodyWeightKg: number;
  experience: GymExperience;
}): Promise<void> {
  const { userId, heightInches, bodyWeightKg, experience } = args;
  const { error: upErr } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      height_inches: heightInches,
      body_weight_kg: bodyWeightKg,
      experience,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (upErr) {
    throw new Error(upErr.message);
  }

  const day = localDateKey(new Date());
  const { error: bwErr } = await supabase.from('body_weight_logs').upsert(
    { user_id: userId, logged_date: day, weight: bodyWeightKg },
    { onConflict: 'user_id,logged_date' },
  );
  if (bwErr) {
    throw new Error(bwErr.message);
  }
}
