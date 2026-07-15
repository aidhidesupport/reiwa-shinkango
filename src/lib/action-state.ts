export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  values?: Record<string, string[]>;
};

export const initialActionState: ActionState = {
  status: "idle",
};

export type StatefulAction = (previousState: ActionState, formData: FormData) => Promise<ActionState>;
