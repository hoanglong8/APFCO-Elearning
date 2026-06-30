"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email hoặc mật khẩu không đúng.");
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      const isAdmin = profile?.role && ["admin", "trainer", "director"].includes(profile.role);
      router.push(isAdmin ? "/admin/dashboard" : "/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError("Không thể gửi link đăng nhập. Vui lòng thử lại.");
    } else {
      setMagicSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-2">
            <span className="text-white font-bold text-2xl">AI</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">APFCO AI Training</h1>
          <p className="text-sm text-gray-500">Cổng đào tạo kỹ năng AI nội bộ</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Đăng nhập</CardTitle>
            <CardDescription>Sử dụng email được cấp bởi ban tổ chức</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="password">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="password" className="flex-1">Mật khẩu</TabsTrigger>
                <TabsTrigger value="magic" className="flex-1">Link đăng nhập</TabsTrigger>
              </TabsList>

              <TabsContent value="password">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ten@apfco.com.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="magic">
                {magicSent ? (
                  <div className="text-center py-6 space-y-2">
                    <div className="text-4xl">📧</div>
                    <p className="font-medium">Kiểm tra email của bạn!</p>
                    <p className="text-sm text-gray-500">
                      Chúng tôi đã gửi link đăng nhập tới <strong>{email}</strong>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="magic-email">Email</Label>
                      <Input
                        id="magic-email"
                        type="email"
                        placeholder="ten@apfco.com.vn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Đang gửi..." : "Gửi link đăng nhập"}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400">
          Powered by FOXAI · hoanglong208@gmail.com
        </p>
      </div>
    </div>
  );
}
