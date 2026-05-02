import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FiUser, FiPhone, FiLock } from "react-icons/fi";
import { registerApi } from "../features/auth/authApi";
import { useAuthStore } from "../features/auth/authStore";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const schema = z.object({
  username: z.string().min(3, "Minimum 3 caractères"),
  phone:    z.string().min(6, "Numéro invalide"),
  password: z.string().min(8, "Minimum 8 caractères"),
});

export default function Register() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const res = await registerApi(data);
      setAuth(res.data.token, res.data.user);
      toast.success("Compte créé !");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'inscription");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
            J<span className="text-purple-500">GAME</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">La plateforme gaming du Cameroun</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-6">Créer un compte</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input {...register("username")} label="Nom d'utilisateur" placeholder="JohnGamer" icon={FiUser} error={errors.username?.message} />
            <Input {...register("phone")} label="Numéro de téléphone" placeholder="670000000" type="tel" icon={FiPhone} error={errors.phone?.message} />
            <Input {...register("password")} label="Mot de passe" placeholder="••••••••" type="password" icon={FiLock} error={errors.password?.message} />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Création..." : "Créer mon compte"}
            </Button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">Se connecter</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}