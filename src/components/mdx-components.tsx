import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: ({ children }) => (
      <h2 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal mt-10 mb-4 leading-tight">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-heading font-semibold text-charcoal mt-8 mb-3 leading-tight">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.8] mb-5">
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <Link
        href={href ?? "#"}
        className="text-green font-medium hover:text-green-dark underline underline-offset-2 decoration-green/30 hover:decoration-green transition-colors duration-200"
      >
        {children}
      </Link>
    ),
    ul: ({ children }) => (
      <ul className="space-y-2 mb-6 pl-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="space-y-2 mb-6 pl-1 list-decimal list-inside">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-grey text-base sm:text-[1.0625rem] leading-[1.8] flex gap-2.5 items-start">
        <svg
          className="w-4 h-4 text-green flex-shrink-0 mt-1.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span>{children}</span>
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-green/30 pl-5 py-1 my-6 bg-green-light/20 rounded-r-lg">
        <div className="text-charcoal/70 text-base italic font-heading">
          {children}
        </div>
      </blockquote>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-charcoal">{children}</strong>
    ),
    hr: () => <hr className="my-8 border-charcoal/8" />,
    ...components,
  };
}
