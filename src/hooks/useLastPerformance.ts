import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchLastPerformance, type SetLog } from '../store/slices/workoutSlice';

export function useLastPerformance(exerciseName: string): {
  data: SetLog[];
  loading: boolean;
} {
  const dispatch = useAppDispatch();
  const data = useAppSelector(
    state => state.workout.lastPerformance?.[exerciseName] ?? [],
  );
  const loading = useAppSelector(
    state => state.workout.lastPerformanceLoading?.[exerciseName] ?? false,
  );

  useEffect(() => {
    if (!exerciseName) {
      return;
    }
    dispatch(fetchLastPerformance(exerciseName));
  }, [dispatch, exerciseName]);

  return useMemo(() => ({ data, loading }), [data, loading]);
}
