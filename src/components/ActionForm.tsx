"use client";

import type { ComponentProps, ReactNode } from "react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { StatefulAction } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";

type ActionFormProps = Omit<ComponentProps<"form">, "action" | "children"> & {
  action: StatefulAction;
  children: ReactNode;
  pendingMessage?: string;
};

function FormFeedback({ message }: { message: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="form-feedback" aria-live="polite" aria-atomic="true">
      <p className="form-status pending">{message}</p>
    </div>
  );
}

export function ActionForm({ action, children, pendingMessage = "送信中…", ...props }: ActionFormProps) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error" || !state.values || !formRef.current) return;
    const values = state.values;
    for (const element of Array.from(formRef.current.elements)) {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
        continue;
      }
      if (!element.name || !(element.name in values) || element instanceof HTMLInputElement && element.type === "password") {
        continue;
      }
      const fieldValues = values[element.name];
      if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
        element.checked = fieldValues.includes(element.value);
      } else {
        element.value = fieldValues[0] ?? "";
      }
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} {...props}>
      {children}
      {state.status === "error" ? (
        <p className="form-status error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="form-status success" role="status">
          {state.message}
        </p>
      ) : null}
      <FormFeedback message={pendingMessage} />
    </form>
  );
}
