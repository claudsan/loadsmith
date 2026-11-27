import { useEffect } from "react";
import { useRunnerStore } from "../store/runnerStore";

export function useRunnerStream(): void {
  const handleRunnerEvent = useRunnerStore((s) => s.handleRunnerEvent);
  const handleStderrLine = useRunnerStore((s) => s.handleStderrLine);
  const handleSidecarExit = useRunnerStore((s) => s.handleSidecarExit);

  useEffect(() => {
    const unsubEvent = window.loadsmith.runner.onEvent(handleRunnerEvent);
    const unsubStderr = window.loadsmith.runner.onStderr(handleStderrLine);
    const unsubExit = window.loadsmith.runner.onExit(handleSidecarExit);

    return () => {
      unsubEvent();
      unsubStderr();
      unsubExit();
    };
  }, [handleRunnerEvent, handleStderrLine, handleSidecarExit]);
}
