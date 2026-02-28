export interface InspectorState {
  method: string;
  path: string;
  statusCode?: number;
  body: unknown;
  response: unknown;
}

function safeJson(value: unknown, maxLen = 2000): string {
  try {
    const s = JSON.stringify(value, null, 2);
    return s.length > maxLen ? `${s.slice(0, maxLen)}\n  ... (truncated)` : s;
  } catch {
    return String(value);
  }
}

export function renderInspector(state: InspectorState): string {
  const statusTag = state.statusCode ? ` → ${state.statusCode}` : '';
  const reqLine = `${state.method || '-'} ${state.path || '-'}${statusTag}`;
  const bodyLine = `body: ${safeJson(state.body, 800)}`;
  const resLine = `response: ${safeJson(state.response, 1200)}`;
  return `${reqLine}\n${bodyLine}\n\n${resLine}`;
}
