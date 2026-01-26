import { forwardRef } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonBaseProps = {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: never;
    external?: never;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
    external?: boolean;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:bg-foreground/0 hover:text-foreground shadow-[inset_0_0_0_0px_var(--color-transparent)] hover:shadow-[inset_0_0_0_1px_var(--color-border)]",
  secondary:
    "shadow-[inset_0_0_0_1px_var(--color-border)] hover:shadow-[inset_0_0_0_0px_var(--color-transparent)] text-foreground hover:bg-foreground hover:text-background",
  ghost:
    "text-foreground hover:bg-foreground/10 shadow-[inset_0_0_0_1px_var(--color-transparent)] hover:shadow-[inset_0_0_0_1px_var(--color-border)]",
};

const baseStyles =
  "inline-flex items-center justify-center rounded-lg px-5 h-10 text-[12px] tracking-[0.025em] font-semibold uppercase whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:pointer-events-none disabled:opacity-50";

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = "primary",
      className = "",
      children,
      ...rest
    } = props;

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

    // If href is provided, render as a link
    if ("href" in props && props.href) {
      const { href, external, ...linkRest } = rest as ButtonAsLink;

      // External link
      if (external) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={combinedClassName}
            {...linkRest}
          >
            {children}
          </a>
        );
      }

      // Internal link using Next.js Link
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={combinedClassName}
          {...linkRest}
        >
          {children}
        </Link>
      );
    }

    // Otherwise render as a button
    const buttonProps = rest as Omit<ButtonAsButton, keyof ButtonBaseProps>;

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={combinedClassName}
        {...buttonProps}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
