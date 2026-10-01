'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import { getConfiguredOptionNext, getInjectedFlowStep } from '../data/wizardFlows';

const initialState = {
  isOpen: false,
  wizardConfig: null,
  currentStepId: null,
  answers: {},
  history: [],
  direction: 'forward',
  outcome: null,
};

function cleanInitialAnswers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const answers = {};
  for (const [stepId, answer] of Object.entries(value).slice(0, 24)) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(stepId)) continue;
    if (typeof answer === 'string' && answer.length <= 160) answers[stepId] = answer;
  }
  return answers;
}

function wizardReducer(state, action) {
  switch (action.type) {
    case 'OPEN_WIZARD': {
      const { config, initialAnswers } = action.payload;
      return {
        ...initialState,
        isOpen: true,
        wizardConfig: config,
        currentStepId: config.steps[0]?.id ?? null,
        answers: cleanInitialAnswers(initialAnswers),
      };
    }

    case 'CLOSE_WIZARD':
      return initialState;

    case 'NAVIGATE_TO':
      return {
        ...state,
        currentStepId: action.payload.stepId,
        history: state.currentStepId ? [...state.history, state.currentStepId] : state.history,
        direction: 'forward',
      };

    case 'GO_BACK': {
      if (state.history.length === 0) return state;
      const previousStepId = state.history[state.history.length - 1];

      return {
        ...state,
        currentStepId: previousStepId,
        history: state.history.slice(0, -1),
        direction: 'backward',
      };
    }

    case 'SET_ANSWER':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.stepId]: action.payload.value,
        },
      };

    case 'SET_OUTCOME':
      return {
        ...state,
        outcome: action.payload.outcome,
      };

    default:
      return state;
  }
}

const WizardContext = createContext(null);

export function resolveNext(step, answers, steps) {
  const validStepIds = new Set((steps ?? []).map((candidate) => candidate.id));
  const configuredNext = getConfiguredOptionNext(step, answers, validStepIds);
  let nextStepId = configuredNext;
  if (!nextStepId && step?.next) {
    nextStepId = typeof step.next === 'function' ? step.next(answers) : step.next;
  }
  if (!nextStepId && steps) {
    const idx = steps.findIndex((s) => s.id === step?.id);
    if (idx >= 0 && idx < steps.length - 1) nextStepId = steps[idx + 1].id;
  }
  if (!nextStepId || !validStepIds.has(nextStepId)) return null;
  return getInjectedFlowStep(nextStepId, step, steps)?.id ?? nextStepId;
}

export function WizardProvider({ children }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  useEffect(() => {
    document.body.style.overflow = state.isOpen ? 'hidden' : 'auto';

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [state.isOpen]);

  const openWizard = useCallback((config, { initialAnswers } = {}) => {
    if (!config?.id || !Array.isArray(config.steps) || config.steps.length === 0) return;
    dispatch({ type: 'OPEN_WIZARD', payload: { config, initialAnswers } });
  }, []);

  const closeWizard = useCallback(() => {
    dispatch({ type: 'CLOSE_WIZARD' });
  }, []);

  const navigateTo = useCallback((stepId) => {
    if (!stepId) return;
    dispatch({ type: 'NAVIGATE_TO', payload: { stepId } });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, []);

  const setAnswer = useCallback((stepId, value) => {
    dispatch({ type: 'SET_ANSWER', payload: { stepId, value } });
  }, []);

  const setOutcome = useCallback((outcome) => {
    dispatch({ type: 'SET_OUTCOME', payload: { outcome } });
  }, []);

  const value = useMemo(() => {
    const steps = state.wizardConfig?.steps ?? [];
    const currentStep = steps.find((step) => step.id === state.currentStepId) ?? null;
    const stepsMap = new Map(steps.map((step) => [step.id, step]));
    const progress = steps.length > 0 ? state.history.length / steps.length : 0;

    return {
      ...state,
      openWizard,
      closeWizard,
      navigateTo,
      goBack,
      setAnswer,
      setOutcome,
      currentStep,
      canGoBack: state.history.length > 0,
      stepsMap,
      progress,
    };
  }, [state, openWizard, closeWizard, navigateTo, goBack, setAnswer, setOutcome]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const context = useContext(WizardContext);

  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }

  return context;
}
