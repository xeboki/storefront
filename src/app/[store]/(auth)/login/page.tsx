import { LoginForm } from '@/components/account/LoginForm';

interface Props {
  params: { store: string };
}

export default function LoginPage({ params }: Props) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">Sign In</h1>
        <LoginForm storeSlug={params.store} />
        <p className="mt-4 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <a href={`/${params.store}/register`} className="text-primary hover:underline font-medium">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
