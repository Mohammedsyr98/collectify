import { AuthShell } from '../components/AuthShell';
import { OwnerSignUpForm } from './OwnerSignUpForm';
import { useOwnerSignUpSubmit } from './useOwnerSignUpSubmit';

export function OwnerSignUpPage() {
  const signUp = useOwnerSignUpSubmit();

  return (
    <AuthShell
      title="Create account"
      subtitle="Set up the owner profile for your Collectify workspace."
    >
      <OwnerSignUpForm isSubmitting={signUp.isSubmitting} onSubmit={signUp.submit} />
    </AuthShell>
  );
}
