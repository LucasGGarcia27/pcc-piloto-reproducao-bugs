// Researcher-only evaluator. Its state and result are never included in model prompts.
export function evaluateHistory(records) {
  let pending = null;
  for (const record of records) {
    if (record.error) continue;
    const { action, before, after, step } = record;
    if (action.type === 'press' && action.value === 'Escape' && before.editing_count === 1) {
      const edited = before.edit_values[0];
      const index = before.editing_indices?.[0] ?? 0;
      const original = before.labels[index];
      if (original && edited && original !== edited && after.editing_count === 1 && after.edit_values[0] === edited) {
        pending = { escape_step: step, index, original, edited };
      }
    } else if (pending) {
      const blurAction = action.type === 'click' || (action.type === 'press' && action.value === 'Tab');
      if (blurAction && before.editing_count === 1 && after.editing_count === 0 && after.labels[pending.index] === pending.edited) {
        return { bug_reproduced: true, ...pending, blur_step: step, rule: 'escape_did_not_cancel_then_blur_committed' };
      }
      if (['fill', 'reload', 'dblclick'].includes(action.type) || (action.type === 'press' && action.value !== 'Tab')) pending = null;
    }
  }
  return { bug_reproduced: false, escape_symptom_seen: pending !== null, rule: 'full_two_part_oracle_not_satisfied' };
}
