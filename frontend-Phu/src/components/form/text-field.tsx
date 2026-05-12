import { useFieldContext } from "@/hooks/form-context";
import { FieldInfo } from "./field-info";

export default function TextField({
  label,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "email" | "password" | "url" | "number";
}) {
  const field = useFieldContext<string>();

  return (
    <div className="space-y-4">
      <label
        htmlFor={field.name}
        className="text-xs uppercase tracking-widest text-muted-foreground font-medium block mb-2"
      >
        {label} {required && "*"}
      </label>
      <input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-background/50 border border-border rounded-[6px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
      />
      <FieldInfo field={field} />
    </div>
  );
}
