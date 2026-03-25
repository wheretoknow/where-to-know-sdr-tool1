import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { OutreachTab } from "./OutreachTab.jsx";

/** Pipeline（外联看板）：ErrorBoundary + OutreachTab */
export function PipelineTab(props) {
  return (
    <ErrorBoundary>
      <OutreachTab {...props} />
    </ErrorBoundary>
  );
}
