// src/pages/AuthPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signUp,
  signIn,
  signOut,
  confirmSignUp,
  getCurrentUser,
} from "@aws-amplify/auth";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"signup" | "signin" | "verify">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [error, setError] = useState("");
  const [tempUsername, setTempUsername] = useState("");
  const navigate = useNavigate();

  // ✅ Redirect if already logged in
  useEffect(() => {
    async function checkUser() {
      try {
        const user = await getCurrentUser();
        if (user) navigate("/dashboard");
      } catch {
        // not signed in
      }
    }
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (activeTab === "signup") {
        // ✅ Sign Up
        const result = await signUp({
          username: email,
          password,
          options: {
            userAttributes: {
              email,
              given_name: firstName,
              family_name: lastName,
            },
          },
        });

        console.log("SignUp result:", result);

        if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          setTempUsername(email);
          setActiveTab("verify");
        } else {
          await signIn({ username: email, password });
          navigate("/dashboard");
        }

      } else if (activeTab === "verify") {
        // ✅ Confirm Code
        await confirmSignUp(tempUsername, confirmationCode);
        await signIn({ username: tempUsername, password });
        navigate("/dashboard");

      } else if (activeTab === "signin") {
        // ✅ Sign In
        try {
          await getCurrentUser();
          await signOut(); // prevent double sessions
        } catch {}
        await signIn({ username: email, password });
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Auth Page</h1>

        {/* Toggle Tabs */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            className={`px-4 py-2 rounded-lg ${activeTab === "signin" ? "bg-blue-600" : "bg-gray-700"}`}
            onClick={() => setActiveTab("signin")}
          >
            Sign In
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${activeTab === "signup" ? "bg-blue-600" : "bg-gray-700"}`}
            onClick={() => setActiveTab("signup")}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {activeTab === "signup" && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="p-2 rounded bg-gray-700"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="p-2 rounded bg-gray-700"
                required
              />
            </>
          )}

          {(activeTab === "signup" || activeTab === "signin") && (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-2 rounded bg-gray-700"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-2 rounded bg-gray-700"
                required
              />
            </>
          )}

          {activeTab === "verify" && (
            <input
              type="text"
              placeholder="Verification Code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              className="p-2 rounded bg-gray-700"
              required
            />
          )}

          <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
            {activeTab === "signup" ? "Sign Up" : activeTab === "signin" ? "Sign In" : "Verify"}
          </button>
        </form>

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

        {activeTab === "signin" && (
          <p className="mt-4 text-sm text-center">
            Don’t have an account?{" "}
            <button
              type="button"
              className="text-blue-400 hover:underline"
              onClick={() => setActiveTab("signup")}
            >
              Sign Up
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
