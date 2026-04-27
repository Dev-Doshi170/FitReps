import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';
import type { PersistedState } from 'redux-persist/es/types';

import authReducer from './slices/authSlice';
import workoutReducer, { workoutInitialState } from './slices/workoutSlice';

type RootPersisted = PersistedState & {
  workout?: Record<string, unknown>;
};

/** Merge new workout fields when older persisted state omits them (redux-persist). */
function migrateWorkoutShape(state: PersistedState): PersistedState {
  if (!state || typeof state !== 'object') {
    return state;
  }
  const s = state as RootPersisted;
  if (!s.workout) {
    return state;
  }
  const w = s.workout;
  const base = workoutInitialState;
  return {
    ...s,
    workout: {
      ...base,
      ...w,
      lastPerformance:
        w.lastPerformance && typeof w.lastPerformance === 'object'
          ? w.lastPerformance
          : base.lastPerformance,
      lastPerformanceLoading:
        w.lastPerformanceLoading && typeof w.lastPerformanceLoading === 'object'
          ? w.lastPerformanceLoading
          : base.lastPerformanceLoading,
      progressionByExercise:
        w.progressionByExercise && typeof w.progressionByExercise === 'object'
          ? w.progressionByExercise
          : base.progressionByExercise,
      progressionLoading:
        w.progressionLoading && typeof w.progressionLoading === 'object'
          ? w.progressionLoading
          : base.progressionLoading,
      sessionRecommendations:
        w.sessionRecommendations && typeof w.sessionRecommendations === 'object'
          ? w.sessionRecommendations
          : base.sessionRecommendations,
      bodyWeightHistory: Array.isArray(w.bodyWeightHistory) ? w.bodyWeightHistory : [],
      todayBodyWeight: w.todayBodyWeight ?? null,
      bodyWeightLoading: typeof w.bodyWeightLoading === 'boolean' ? w.bodyWeightLoading : false,
      bodyWeightError: w.bodyWeightError ?? null,
      todayWorkoutLoading: typeof w.todayWorkoutLoading === 'boolean' ? w.todayWorkoutLoading : false,
      todayWorkoutError: w.todayWorkoutError ?? null,
      activePlanDayId: typeof w.activePlanDayId === 'string' ? w.activePlanDayId : null,
      planSessionCards: Array.isArray(w.planSessionCards) ? w.planSessionCards : [],
      lastPerformedByPlanDayId:
        w.lastPerformedByPlanDayId && typeof w.lastPerformedByPlanDayId === 'object'
          ? w.lastPerformedByPlanDayId
          : {},
      planSessionsLoading: typeof w.planSessionsLoading === 'boolean' ? w.planSessionsLoading : false,
      planSessionsError: w.planSessionsError ?? null,
      selectedPlanId: typeof w.selectedPlanId === 'string' ? w.selectedPlanId : null,
      activePlanName: typeof w.activePlanName === 'string' ? w.activePlanName : null,
      sessionStartedAt:
        typeof w.sessionStartedAt === 'number' ? w.sessionStartedAt : null,
      startSuggestionByExercise:
        w.startSuggestionByExercise && typeof w.startSuggestionByExercise === 'object'
          ? w.startSuggestionByExercise
          : base.startSuggestionByExercise,
      userProfile:
        w.userProfile != null && typeof w.userProfile === 'object'
          ? w.userProfile
          : null,
      userProfileStatus:
        w.userProfileStatus === 'ready' || w.userProfileStatus === 'loading' || w.userProfileStatus === 'idle'
          ? w.userProfileStatus
          : base.userProfileStatus,
    },
  } as PersistedState;
}

const persistConfig = {
  key: 'root',
  /** Bump when `migrateWorkoutShape` must run again for already-persisted clients. */
  version: 6,
  storage: AsyncStorage,
  whitelist: ['auth', 'workout'],
  migrate: (state: PersistedState) => Promise.resolve(migrateWorkoutShape(state)),
};

const rootReducer = combineReducers({
  auth: authReducer,
  workout: workoutReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
