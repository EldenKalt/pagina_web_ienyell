const SAFE_OPTION_ID = /^[a-zA-Z0-9_-]{1,80}$/;

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function mergeSelectableOption(option, override = {}) {
  const next = {
    ...option,
    label: asText(override.label) ?? option.label,
    description: asText(override.description) ?? option.description,
    isActive: override.isActive ?? option.isActive ?? true,
  };
  const priceOptionId = asText(override.priceOptionId);
  const nextStepId = asText(override.nextStepId);
  if (priceOptionId && SAFE_OPTION_ID.test(priceOptionId)) next.priceOptionId = priceOptionId;
  if (nextStepId && SAFE_OPTION_ID.test(nextStepId)) next.nextStepId = nextStepId;
  return next;
}

function mergeChecklistItem(item, override = {}) {
  return {
    ...item,
    label: asText(override.label) ?? item.label,
    detail: asText(override.detail) ?? item.detail,
    isActive: override.isActive ?? item.isActive ?? true,
  };
}

function flowQuestion(question, index, allQuestions) {
  const nextQuestion = allQuestions[index + 1];
  return {
    id: question.id,
    type: question.type,
    title: question.title,
    description: question.description,
    min: question.type === 'multi-select' ? question.min : undefined,
    max: question.type === 'multi-select' ? question.max : undefined,
    options: question.options,
    next: nextQuestion?.id ?? question.beforeStepId,
    beforeStepId: question.beforeStepId,
    isFlowQuestion: true,
  };
}

function cleanExtraQuestions(input, knownStepIds) {
  if (!Array.isArray(input)) return [];
  const questions = [];
  const usedIds = new Set();
  for (const question of input) {
    if (question?.isActive === false || !SAFE_OPTION_ID.test(question.id) || usedIds.has(question.id)) continue;
    if (!['single-select', 'multi-select'].includes(question.type)) continue;
    if (!knownStepIds.has(question.beforeStepId)) continue;
    const options = (Array.isArray(question.options) ? question.options : [])
      .filter((option) => option?.isActive !== false && SAFE_OPTION_ID.test(option.id) && asText(option.label))
      .map((option) => mergeSelectableOption({ id: option.id, label: option.label, description: option.description }, option));
    if (!options.length || !asText(question.title)) continue;
    usedIds.add(question.id);
    questions.push({
      id: question.id,
      title: question.title.trim(),
      description: asText(question.description),
      type: question.type,
      beforeStepId: question.beforeStepId,
      min: Number.isInteger(question.min) ? Math.max(0, question.min) : undefined,
      max: Number.isInteger(question.max) ? Math.max(1, question.max) : undefined,
      options,
    });
  }
  return questions;
}

/**
 * Applies content-only flow settings to a reviewed wizard definition.
 * The settings can never install a function or a new calculator formula.
 */
export function getRuntimeWizard(wizard, settings = {}) {
  if (!wizard) return null;
  const sourceSettings = asObject(settings);
  const stepSettings = asObject(sourceSettings.steps);
  const knownStepIds = new Set((wizard.steps ?? []).map((step) => step.id));
  const baseSteps = (wizard.steps ?? []).map((step) => {
    const override = asObject(stepSettings[step.id]);
    const next = {
      ...step,
      title: asText(override.title) ?? step.title,
      description: asText(override.description) ?? step.description,
    };

    if (Array.isArray(step.options)) {
      const optionSettings = asObject(override.options);
      const existing = step.options
        .map((option) => mergeSelectableOption(option, asObject(optionSettings[option.id])))
        .filter((option) => option.isActive !== false);
      const added = (Array.isArray(override.addedOptions) ? override.addedOptions : [])
        .filter((option) => option?.isActive !== false && SAFE_OPTION_ID.test(option.id) && asText(option.label))
        .map((option) => mergeSelectableOption({ id: option.id, label: option.label, description: option.description }, option));
      const seenIds = new Set(existing.map((option) => option.id));
      next.options = [...existing, ...added.filter((option) => !seenIds.has(option.id))];
    }

    if (Array.isArray(step.items)) {
      const itemSettings = asObject(override.items);
      next.items = step.items
        .map((item) => mergeChecklistItem(item, asObject(itemSettings[item.id])))
        .filter((item) => item.isActive !== false);
    }
    return next;
  });

  const extraQuestions = cleanExtraQuestions(sourceSettings.extraQuestions, knownStepIds);
  const groupedQuestions = new Map();
  for (const question of extraQuestions) {
    const group = groupedQuestions.get(question.beforeStepId) ?? [];
    group.push(question);
    groupedQuestions.set(question.beforeStepId, group);
  }
  const extraSteps = [];
  for (const questions of groupedQuestions.values()) {
    questions.forEach((question, index) => extraSteps.push(flowQuestion(question, index, questions)));
  }

  return {
    ...wizard,
    title: asText(sourceSettings.title) ?? wizard.title,
    isActive: sourceSettings.isActive ?? true,
    steps: [...baseSteps, ...extraSteps],
  };
}

function optionForAnswer(step, answer) {
  if (step?.type !== 'single-select' || !answer) return null;
  return (step.options ?? []).find((option) => option.id === answer) ?? null;
}

export function getConfiguredOptionNext(step, answers, validStepIds) {
  const option = optionForAnswer(step, answers?.[step?.id]);
  return option?.nextStepId && validStepIds.has(option.nextStepId) ? option.nextStepId : null;
}

export function getInjectedFlowStep(nextStepId, currentStep, steps) {
  if (!nextStepId || currentStep?.isFlowQuestion) return null;
  return (steps ?? []).find((step) => step.isFlowQuestion && step.beforeStepId === nextStepId) ?? null;
}

export function getFlowAddonDefaults(steps, answers, availableAddons = []) {
  const available = new Map((availableAddons ?? []).map((addon) => [addon.id, addon]));
  const defaults = {};
  for (const step of steps ?? []) {
    const selected = step.type === 'multi-select'
      ? (Array.isArray(answers?.[step.id]) ? answers[step.id] : [])
      : [answers?.[step.id]];
    for (const optionId of selected) {
      const option = (step.options ?? []).find((item) => item.id === optionId);
      const addon = option?.priceOptionId ? available.get(option.priceOptionId) : null;
      if (!addon) continue;
      defaults[addon.id] = addon.per ? Math.max(1, Number(defaults[addon.id]) || 0) : true;
    }
  }
  return defaults;
}

export function getFlowEditorSteps(wizard) {
  return (wizard?.steps ?? []).filter((step) => ['single-select', 'multi-select', 'checklist'].includes(step.type));
}

export function getFlowCalculatorTargets(wizard) {
  return (wizard?.steps ?? [])
    .filter((step) => step.type === 'calculator')
    .map((step) => ({ id: step.id, label: step.title || step.id }));
}
