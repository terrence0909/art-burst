// src/AuthPage.tsx
import React, { useState, useEffect } from 'react';
import { signIn, signUp, confirmSignUp, getCurrentUser } from 'aws-amplify/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';

const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        // If user is already authenticated, redirect to home
        navigate('/');
      } catch (err) {
        // User is not authenticated, stay on auth page
        console.log('No authenticated user');
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signIn({ username: email, password });
      console.log('Sign in successful');
      
      // Get the current user to display their name
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // Show success message and redirect to home
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
        duration: 3000,
      });
      
      // Redirect to home page
      navigate('/');
    } catch (err) {
      console.error('Error signing in:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: email, // Using email as username
        password,
        options: {
          userAttributes: {
            email,
            given_name: givenName,
            family_name: familyName,
          },
          autoSignIn: true
        }
      });

      if (!isSignUpComplete && nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setNeedsConfirmation(true);
      }
    } catch (err) {
      console.error('Error signing up:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmation = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode
      });

      if (isSignUpComplete) {
        // Get the current user after confirmation
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        // Show success message and redirect to home
        toast({
          title: "Account confirmed!",
          description: "Your account has been successfully created.",
          duration: 3000,
        });
        
        // Redirect to home page
        navigate('/');
      }
    } catch (err) {
      console.error('Error confirming sign up:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during confirmation');
    } finally {
      setIsLoading(false);
    }
  };

  // Confirmation UI
  if (needsConfirmation) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl">Confirm Your Account</CardTitle>
              <CardDescription>
                Enter the confirmation code sent to your email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confirmationCode">Confirmation Code</Label>
                  <Input
                    id="confirmationCode"
                    type="text"
                    placeholder="Enter the 6-digit code"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                {error && (
                  <div className="p-3 text-sm font-medium text-destructive bg-destructive/15 rounded-md">
                    {error}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-11" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Confirming...' : 'Confirm Account'}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Didn't receive a code?{' '}
                <button 
                  type="button" 
                  className="text-primary underline-offset-4 hover:underline font-medium"
                  onClick={() => setNeedsConfirmation(false)}
                >
                  Go back
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Auth UI
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Welcome to ArtBurst</CardTitle>
            <CardDescription>
              {activeTab === 'signin' 
                ? 'Sign in to your account' 
                : 'Create a new account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  {error && (
                    <div className="p-3 text-sm font-medium text-destructive bg-destructive/15 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-11" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <button 
                    type="button" 
                    className="text-primary underline-offset-4 hover:underline font-medium"
                    onClick={() => setActiveTab('signup')}
                  >
                    Sign up
                  </button>
                </div>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="givenName">First Name</Label>
                      <Input
                        id="givenName"
                        type="text"
                        placeholder="First name"
                        value={givenName}
                        onChange={(e) => setGivenName(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="familyName">Last Name</Label>
                      <Input
                        id="familyName"
                        type="text"
                        placeholder="Last name"
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  {error && (
                    <div className="p-3 text-sm font-medium text-destructive bg-destructive/15 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-11" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Sign up'}
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    className="text-primary underline-offset-4 hover:underline font-medium"
                    onClick={() => setActiveTab('signin')}
                  >
                    Sign in
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;