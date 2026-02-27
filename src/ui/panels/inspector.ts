export interface InspectorState {
  method: string;
  path: string;
  body: unknown;
  response: unknown;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function renderInspector(state: InspectorState): string {
  const reqLine = `${state.method || '-'} ${state.path || '-'}   body: ${safeJson(state.body)}`;
  const resLine = `→ ${safeJson(state.response)}`;
  const merged = `${reqLine}\n${resLine}`;
  return merged.length > 1200 ? `${merged.slice(0, 1200)}...` : merged;
}
