import { RegisterForm } from '@/components/account/RegisterForm';

interface Props {
  params: { store: string };
}

export default function RegisterPage({ params }: Props) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-fg mb-6 text-center">Create Account</h1>
        <RegisterForm storeSlug={params.store} />
        <p className="mt-4 text-center text-sm text-fg-muted">
          Already have an account?{' '}
          <a href={`/${params.store}/login`} className="text-primary hover:underline font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
