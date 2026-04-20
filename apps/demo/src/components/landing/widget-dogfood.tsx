"use client";

import { useEffect } from "react";

export function WidgetDogfood() {
  useEffect(() => {
    let destroyed = false;
    let instance: { destroy: () => void } | null = null;

    import("@ccm-feedback/widget").then(({ initCcmFeedback }) => {
      if (destroyed) return;
      instance = initCcmFeedback({
        endpoint: "/api/feedback",
        projectName: "landing",
        forceShow: true,
        accentColor: "#173CFF",
        locale: "en",
        position: "bottom-right",
      });
    });

    return () => {
      destroyed = true;
      instance?.destroy();
    };
  }, []);

  return null;
}
