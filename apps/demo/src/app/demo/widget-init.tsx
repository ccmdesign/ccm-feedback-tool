"use client";

import { useEffect } from "react";

export function WidgetInit() {
  useEffect(() => {
    let destroyed = false;
    let instance: { destroy: () => void } | null = null;

    import("@ccm-feedback/widget").then(({ initCcmFeedback }) => {
      if (destroyed) return;
      instance = initCcmFeedback({
        endpoint: "/api/feedback",
        projectName: "demo",
        forceShow: true,
        accentColor: "#173CFF",
        locale: "en",
        agentApiUrl: "/api/v1/agent/feedback",
      });
    });

    return () => {
      destroyed = true;
      instance?.destroy();
    };
  }, []);

  return null;
}
