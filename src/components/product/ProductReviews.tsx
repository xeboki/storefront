'use client';

import { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/stores/authStore';

interface Review {
  id: string;
  customerName: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
}

interface Props {
  storeSlug: string;
  productId: string;
}

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
        />
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ProductReviews({ storeSlug, productId }: Props) {
  const customer = useAuthStore((s) => s.customer);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?storeSlug=${storeSlug}&productId=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [storeSlug, productId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, productId, rating, title: title.trim(), body: body.trim() }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error ?? 'Failed to submit review');
      return;
    }

    setSubmitted(true);
    setShowForm(false);
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5">
              <StarRow rating={Math.round(avgRating)} size={14} />
              <span className="text-sm text-slate-500">
                {avgRating.toFixed(1)} ({total})
              </span>
            </div>
          )}
        </div>

        {customer && !submitted && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
          >
            <MessageSquare size={15} />
            Write a review
          </button>
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <form onSubmit={submitReview} className="rounded-brand border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900">Your Review</h3>

          {/* Star picker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Rating</label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  onMouseEnter={() => setHoverRating(i + 1)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star
                    size={24}
                    className={clsx(
                      'transition-colors',
                      i < (hoverRating || rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300 fill-slate-300',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Title <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarise your experience"
              className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Review <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell others what you think…"
              className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-brand hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-brand hover:border-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {submitted && (
        <div className="rounded-brand border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Thank you! Your review has been submitted for approval.
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-brand border border-slate-100 p-4 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-1/4" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-slate-400">
          No reviews yet.{customer ? ' Be the first to leave one.' : ''}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {reviews.map((review) => (
            <li key={review.id} className="py-4 space-y-1">
              <div className="flex items-center gap-2">
                <StarRow rating={review.rating} size={14} />
                {review.title && (
                  <span className="font-semibold text-slate-900 text-sm">{review.title}</span>
                )}
              </div>
              {review.body && <p className="text-sm text-slate-600">{review.body}</p>}
              <p className="text-xs text-slate-400">
                {review.customerName ?? 'Anonymous'} · {formatDate(review.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
