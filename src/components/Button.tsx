import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "rk-btn-primary",
  ghost: "rk-btn-ghost",
};

const BASE_CLASS =
  "transition-colors duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`${VARIANT_CLASS[variant]} ${BASE_CLASS} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export default Button;
