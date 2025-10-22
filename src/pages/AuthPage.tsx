import React, { useState, useEffect } from 'react';
import { signIn, signUp, confirmSignUp, getCurrentUser } from 'aws-amplify/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import FULL_LOGO from '@/assets/FULL-LOGO.png';

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
      <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-gray-300 to-gray-500 p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl">
            <CardHeader className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <img 
                  src={FULL_LOGO} 
                  alt="ArtBurst" 
                  className="h-24 w-auto object-contain"
                />
              </div>
              <CardTitle className="text-2xl text-gray-800">Confirm Your Account</CardTitle>
              <CardDescription className="text-gray-700">
                Enter the confirmation code sent to your email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confirmationCode" className="text-gray-800">Confirmation Code</Label>
                  <Input
                    id="confirmationCode"
                    type="text"
                    placeholder="Enter the 6-digit code"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 backdrop-blur-sm bg-white/20 border-white/30"
                  />
                </div>
                {error && (
                  <div className="p-3 text-sm font-medium text-red-700 bg-red-50/80 border border-red-200/30 rounded-md">
                    {error}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-11 backdrop-blur-sm bg-white/20 border-white/30 hover:shadow-2xl transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? 'Confirming...' : 'Confirm Account'}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-gray-700">
                Didn't receive a code?{' '}
                <button 
                  type="button" 
                  className="text-gray-800 underline-offset-4 hover:underline font-medium"
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
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-gray-300 to-gray-500 p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <img 
                src={FULL_LOGO} 
                alt="ArtBurst" 
                className="h-24 w-auto object-contain"
              />
            </div>
            <CardDescription className="text-gray-700">
              {activeTab === 'signin' 
                ? 'Sign in to your account' 
                : 'Create a new account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6 backdrop-blur-sm bg-white/20 border border-white/30">
                <TabsTrigger value="signin" className="data-[state=active]:bg-white/30">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-white/30">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-800">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 backdrop-blur-sm bg-white/20 border-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-gray-800">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-gray-700 hover:underline"
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
                      className="h-11 backdrop-blur-sm bg-white/20 border-white/30"
                    />
                  </div>
                  {error && (
                    <div className="p-3 text-sm font-medium text-red-700 bg-red-50/80 border border-red-200/30 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-11 backdrop-blur-sm bg-white/20 border-white/30 hover:shadow-2xl transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-700">
                  Don't have an account?{' '}
                  <button 
                    type="button" 
                    className="text-gray-800 underline-offset-4 hover:underline font-medium"
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
                      <Label htmlFor="givenName" className="text-gray-800">First Name</Label>
                      <Input
                        id="givenName"
                        type="text"
                        placeholder="First name"
                        value={givenName}
                        onChange={(e) => setGivenName(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-11 backdrop-blur-sm bg-white/20 border-white/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="familyName" className="text-gray-800">Last Name</Label>
                      <Input
                        id="familyName"
                        type="text"
                        placeholder="Last name"
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-11 backdrop-blur-sm bg-white/20 border-white/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-800">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 backdrop-blur-sm bg-white/20 border-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-800">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 backdrop-blur-sm bg-white/20 border-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-gray-800">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 backdrop-blur-sm bg-white/20 border-white/30"
                    />
                  </div>
                  {error && (
                    <div className="p-3 text-sm font-medium text-red-700 bg-red-50/80 border border-red-200/30 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-11 backdrop-blur-sm bg-white/20 border-white/30 hover:shadow-2xl transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Sign up'}
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-700">
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    className="text-gray-800 underline-offset-4 hover:underline font-medium"
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