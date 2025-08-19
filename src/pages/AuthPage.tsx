import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp, confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "verify">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempUsername, setTempUsername] = useState(""); // Store random username for verification
  const navigate = useNavigate();

  // Password validation function
  const validatePassword = (password: string) => {
    const requirements = [
      { regex: /.{8,}/, message: "8+ characters" },
      { regex: /[A-Z]/, message: "1 uppercase letter" },
      { regex: /[a-z]/, message: "1 lowercase letter" },
      { regex: /\d/, message: "1 number" },
      { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, message: "1 special character" }
    ];

    const missing = requirements.filter(req => !req.regex.test(password));
    return {
      isValid: missing.length === 0,
      message: missing.length > 0
        ? `Missing requirements:\n${missing.map(m => `• ${m.message}`).join("\n")}`
        : "Password meets all requirements"
    };
  };

  // Generate random username (not email format)
  const generateUsername = () => {
    return `user_${Math.random().toString(36).substring(2, 10)}`;
  };

  const handleAuthError = (err: unknown) => {
    if (err instanceof Error) {
      switch (err.name) {
        case "UserNotConfirmedException":
          setActiveTab("verify");
          setError("Please verify your email first");
          break;
        case "UsernameExistsException":
          setError("Email already exists. Please sign in");
          setActiveTab("signin");
          break;
        case "NotAuthorizedException":
          setError("Incorrect email or password");
          break;
        case "CodeMismatchException":
          setError("Invalid verification code");
          break;
        case "ExpiredCodeException":
          setError("Code expired. Please request a new one");
          break;
        case "InvalidParameterException":
          const validation = validatePassword(password);
          setError(validation.isValid
            ? "Server rejected password. Try a different one."
            : validation.message);
          break;
        default:
          setError(err.message || "Authentication failed");
      }
    } else {
      setError("Authentication failed");
    }
  };

  const handleResendCode = async () => {
    try {
      await resendSignUpCode({ username: tempUsername }); // Use tempUsername, not email
      setError("Verification code resent. Check your email.");
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (activeTab === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords don't match");
        }

        const validation = validatePassword(password);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }

        // Generate random username (cannot use email format)
        const randomUsername = generateUsername();
        setTempUsername(randomUsername); // Store for verification

        const { nextStep } = await signUp({
          username: randomUsername,  // Use random username, NOT email
          password,
          options: {
            userAttributes: {
              email: email,          // Email goes in attributes
              given_name: firstName,
              family_name: lastName,
            },
            autoSignIn: {
              enabled: true,
            }
          }
        });

        if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          setActiveTab("verify");
        }
      } else if (activeTab === "signin") {
        // For sign-in, use email as username (this works)
        const { isSignedIn, nextStep } = await signIn({
          username: email,
          password
        });

        if (isSignedIn) {
          navigate("/dashboard");
        } else if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
          setActiveTab("verify");
        }
      } else if (activeTab === "verify") {
        // For verification, use the random username, not email
        await confirmSignUp({ 
          username: tempUsername, 
          confirmationCode: code 
        });
        
        // After verification, sign in with email
        await signIn({ 
          username: email,  // Use email for sign-in
          password 
        });
        
        navigate("/dashboard");
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {activeTab === "signin" ? "Sign In" :
             activeTab === "signup" ? "Create Account" : "Verify Email"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" onClick={() => { setActiveTab("signin"); setError(""); }}>
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" onClick={() => { setActiveTab("signup"); setError(""); }}>
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleAuth} className="space-y-4">
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" />
                <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing In..." : "Sign In"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required autoComplete="given-name" />
                  <Input placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required autoComplete="family-name" />
                </div>
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                <Input type="password" placeholder="Create Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
                <Input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
                <div className="text-xs text-muted-foreground p-2 bg-gray-50 rounded">
                  <p className="font-semibold">Password must contain:</p>
                  <ul className="list-disc pl-4">
                    <li>At least 8 characters</li>
                    <li>1 uppercase letter</li>
                    <li>1 lowercase letter</li>
                    <li>1 number</li>
                    <li>1 special character (!@#$% etc.)</li>
                  </ul>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating Account..." : "Sign Up"}</Button>
              </form>
            </TabsContent>
          </Tabs>

          {activeTab === "verify" && (
            <form onSubmit={handleAuth} className="space-y-4 mt-4">
              <p className="text-sm text-center">Verification code sent to: {email}</p>
              <Input type="text" placeholder="Enter 6-digit code" value={code} onChange={e => setCode(e.target.value)} required autoComplete="one-time-code" />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verifying..." : "Verify Account"}</Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleResendCode} disabled={loading}>Resend Code</Button>
            </form>
          )}

          {error && <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 rounded-md whitespace-pre-line">{error}</div>}
        </CardContent>
      </Card>
    </div>
  );
}