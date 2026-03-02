import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Scale, ChevronRight, Mail, Lock, User } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import { SiGoogle } from "react-icons/si";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, isLoggingIn, isRegistering, user } = useAuth();
  const [location] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const redirectParam = new URLSearchParams(location.split("?")[1] ?? "").get("redirect");

  if (user) {
    return <Redirect to={redirectParam || "/dashboard"} />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      login({ email, password });
    } else {
      register({ email, password, name });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
        {/* Decorative elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Scale className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl tracking-tight text-foreground">Alegatto</h1>
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Costa Rica</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-display text-5xl font-bold leading-tight mb-6">
              El asistente legal <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300">
                definitivo
              </span> para Costa Rica
            </h2>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Redacta, revisa y firma documentos legales en minutos. Respaldado por inteligencia artificial entrenada en la normativa costarricense.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 flex gap-4 text-sm text-muted-foreground">
          <span>&copy; 2024 Alegatto Costa Rica.</span>
          <a href="#" className="hover:text-primary transition-colors">Términos</a>
          <a href="#" className="hover:text-primary transition-colors">Privacidad</a>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md">
          <div className="text-center mb-10 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 mx-auto mb-4">
              <Scale className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-display font-bold text-3xl tracking-tight text-foreground">Alegatto</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold font-display text-foreground">
              {isLogin ? "Bienvenido de nuevo" : "Crear una cuenta"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isLogin 
                ? "Ingresa tus credenciales para continuar." 
                : "Comienza a automatizar tu flujo legal hoy."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium text-foreground">Nombre completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      required={!isLogin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Juan Pérez"
                      className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@ejemplo.com"
                  className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Contraseña</label>
                {isLogin && (
                  <a href="#" className="text-xs text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || isRegistering}
              className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-gradient-to-r from-primary to-emerald-400 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoggingIn || isRegistering ? "Procesando..." : (isLogin ? "Iniciar Sesión" : "Crear Cuenta")}
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 mt-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">o continuar con</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google OAuth */}
          <a
            href="/api/auth/google"
            data-testid="button-google-login"
            className="mt-4 flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-secondary transition-colors"
          >
            <SiGoogle className="w-4 h-4 text-[#4285F4]" />
            Continuar con Google
          </a>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 font-bold text-primary hover:underline focus:outline-none"
              >
                {isLogin ? "Regístrate" : "Inicia Sesión"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
