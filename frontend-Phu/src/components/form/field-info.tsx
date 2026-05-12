import { AnyFieldApi } from "@tanstack/react-form";

export function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid
        ? field.state.meta.errors.map((err) => (
            <em key={err.message}>{err.message}</em>
          ))
        : null}
      {field.state.meta.isValidating ? "Validating..." : null}
    </>
  );
}
