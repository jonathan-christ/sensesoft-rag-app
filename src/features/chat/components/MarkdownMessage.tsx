"use client";

import {
  cloneElement,
  isValidElement,
  memo,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type TableHTMLAttributes,
  type ThHTMLAttributes,
  type TdHTMLAttributes,
} from "react";
import Markdown from "markdown-to-jsx";

import type { Citation } from "@/lib/types";
import { parseDocumentReferences } from "@/features/chat/components/CitationsPanel";
import { cn } from "@/features/shared/lib/utils";

interface MarkdownMessageProps {
  content: string;
  citations?: Citation[];
  className?: string;
}

function processNodes(
  node: ReactNode,
  citations: Citation[] = [],
  allowCitations = true,
): ReactNode {
  const applyCitations = (text: string) =>
    allowCitations ? parseDocumentReferences(text, citations) : text;

  if (typeof node === "string") {
    return applyCitations(node);
  }

  if (Array.isArray(node)) {
    const result: ReactNode[] = [];
    node.forEach((child, index) => {
      const processed = processNodes(child, citations, allowCitations);
      if (Array.isArray(processed)) {
        processed.forEach((grandChild, grandIndex) => {
          result.push(
            isValidElement(grandChild) && grandChild.key == null
              ? cloneElement(grandChild, {
                  key: `citation-${index}-${grandIndex}`,
                })
              : grandChild,
          );
        });
      } else {
        result.push(processed);
      }
    });
    return result;
  }

  if (isValidElement(node)) {
    const { type, props } = node as typeof node & {
      props: { children?: ReactNode };
    };
    const nextAllow = allowCitations && type !== "code" && type !== "pre";
    const processedChildren = processNodes(
      props.children,
      citations,
      nextAllow,
    );
    return cloneElement(node, undefined, processedChildren);
  }

  return node;
}

function MarkdownMessageBase({
  content,
  citations,
  className,
}: MarkdownMessageProps) {
  const normalizedCitations = citations ?? [];

  const overrides = {
    p: {
      component: ({
        children,
        className: c,
        ...rest
      }: {
        children: ReactNode;
        className?: string;
      }) => (
        <p
          {...rest}
          className={cn(
            "text-sm leading-6 text-inherit [&:not(:first-child)]:mt-2",
            c,
          )}
        >
          {processNodes(children, normalizedCitations)}
        </p>
      ),
    },
    strong: {
      component: ({
        children,
        className: c,
        ...rest
      }: {
        children: ReactNode;
        className?: string;
      }) => (
        <strong {...rest} className={cn("font-semibold text-inherit", c)}>
          {processNodes(children, normalizedCitations)}
        </strong>
      ),
    },
    em: {
      component: ({
        children,
        className: c,
        ...rest
      }: {
        children: ReactNode;
        className?: string;
      }) => (
        <em {...rest} className={cn("italic text-inherit", c)}>
          {processNodes(children, normalizedCitations)}
        </em>
      ),
    },
    ul: {
      component: ({
        children,
        className: c,
        ...rest
      }: {
        children: ReactNode;
        className?: string;
      }) => (
        <ul
          {...rest}
          className={cn(
            "list-disc pl-5 space-y-2 text-sm leading-6 text-inherit",
            c,
          )}
        >
          {processNodes(children, normalizedCitations)}
        </ul>
      ),
    },
    ol: {
      component: ({
        children,
        className: c,
        ...rest
      }: {
        children: ReactNode;
        className?: string;
      }) => (
        <ol
          {...rest}
          className={cn(
            "list-decimal pl-5 space-y-2 text-sm leading-6 text-inherit",
            c,
          )}
        >
          {processNodes(children, normalizedCitations)}
        </ol>
      ),
    },
    li: {
      component: ({
        children,
        className: c,
        ...rest
      }: {
        children: ReactNode;
        className?: string;
      }) => (
        <li
          {...rest}
          className={cn(
            "marker:text-muted-foreground text-sm leading-6 text-inherit",
            c,
          )}
        >
          {processNodes(children, normalizedCitations)}
        </li>
      ),
    },
    blockquote: {
      component: ({
        children,
        className: c,
        ...rest
      }: {
        children: ReactNode;
        className?: string;
      }) => (
        <blockquote
          {...rest}
          className={cn(
            "border-l-2 border-primary/40 pl-3 italic text-sm leading-6 text-inherit",
            c,
          )}
        >
          {processNodes(children, normalizedCitations)}
        </blockquote>
      ),
    },
    a: {
      component: ({
        children,
        className: c,
        ...rest
      }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a
          {...rest}
          target={rest.target ?? "_blank"}
          rel={rest.rel ?? "noreferrer"}
          className={cn(
            "text-primary underline underline-offset-4 hover:text-primary/80",
            c,
          )}
        >
          {processNodes(children, normalizedCitations)}
        </a>
      ),
    },
    code: {
      component: ({
        children,
        className: c,
        ...rest
      }: HTMLAttributes<HTMLElement>) => (
        <code
          {...rest}
          className={cn(
            "rounded bg-muted px-1 py-0.5 text-[0.75rem] font-mono text-inherit",
            c,
          )}
        >
          {children}
        </code>
      ),
    },
    pre: {
      component: ({
        children,
        className: c,
        ...rest
      }: HTMLAttributes<HTMLPreElement>) => (
        <pre
          {...rest}
          className={cn(
            "mt-4 overflow-x-auto rounded-md bg-muted p-3 text-sm",
            c,
          )}
        >
          {children}
        </pre>
      ),
    },
    table: {
      component: ({
        children,
        className: c,
        ...rest
      }: TableHTMLAttributes<HTMLTableElement>) => (
        <div className="my-4 overflow-x-auto rounded-md border">
          <table {...rest} className={cn("w-full border-collapse text-sm", c)}>
            {children}
          </table>
        </div>
      ),
    },
    th: {
      component: ({
        children,
        className: c,
        ...rest
      }: ThHTMLAttributes<HTMLTableCellElement>) => (
        <th
          {...rest}
          className={cn(
            "border-b bg-muted px-3 py-2 text-left font-semibold",
            c,
          )}
        >
          {children}
        </th>
      ),
    },
    td: {
      component: ({
        children,
        className: c,
        ...rest
      }: TdHTMLAttributes<HTMLTableCellElement>) => (
        <td {...rest} className={cn("border-b px-3 py-2 align-top", c)}>
          {children}
        </td>
      ),
    },
  };

  return (
    <div className={cn("text-sm leading-6 text-inherit", className)}>
      <Markdown options={{ overrides }}>{content}</Markdown>
    </div>
  );
}

export const MarkdownMessage = memo(MarkdownMessageBase);
