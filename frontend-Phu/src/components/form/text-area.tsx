import { useStore } from "@tanstack/react-form";
import { useFieldContext } from "@/hooks/form-context";

export default function TextArea({
  label,
  required,
  placeholder,
  rows = 3,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  const field = useFieldContext<string>();

  const errors = useStore(field.store, (state) => state.meta.errors);

  return (
    <div className="space-y-2">
      <label
        htmlFor={field.name}
        className="text-xs uppercase tracking-widest text-muted-foreground font-medium block mb-2"
      >
        {label} {required && "*"}
      </label>
      <textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 bg-background/50 border border-border rounded-[6px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
      />
      {errors.map((error: string) => (
        <div key={error} style={{ color: "red" }}>
          {error}
        </div>
      ))}
    </div>
  );
}
