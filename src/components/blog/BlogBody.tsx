/**
 * Renders blog post body content (Markdown).
 * Uses react-markdown + remark-gfm for GitHub Flavored Markdown.
 * Run `npm install` after adding react-markdown and remark-gfm to package.json.
 */
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  body: string;
}

export function BlogBody({ body }: Props) {
  return (
    <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-brand prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-blockquote:border-primary prose-blockquote:text-slate-600">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
