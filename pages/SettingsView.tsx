import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { User as UserIcon, Mail, Lock, Camera, Settings, Verified, Bell, Loader2, Save, Key, UserCircle, ShieldCheck, Globe } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  whatsapp: string | null;
  avatar_url: string | null;
}

const SettingsView: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setWhatsapp(data.whatsapp || '');
        setEmail(user.email || '');
      }
    } catch (error: any) {
      showToast(error.message || 'Erro ao carregar perfil', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          whatsapp: whatsapp
        })
        .eq('id', profile.id);

      if (error) throw error;
      showToast('Perfil atualizado com sucesso!', 'success');
      await fetchProfile();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      showToast('As senhas não coincidem', 'error');
      return;
    }

    try {
      setSaving(true);

      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }

      showToast('Dados de acesso atualizados!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar dados de acesso', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!e.target.files || e.target.files.length === 0 || !profile) return;

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      showToast('Foto de perfil atualizada!', 'success');
      await fetchProfile();
    } catch (error: any) {
      showToast(error.message || 'Erro no upload da imagem', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };


  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <p className="text-xl font-black text-slate-400 animate-pulse">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 h-fit">
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2rem] overflow-hidden shadow-xl border-4 border-white dark:border-slate-700 mb-6 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    className="w-full h-full object-cover"
                    alt="Profile"
                  />
                ) : (
                  <UserCircle className="w-20 h-20 text-slate-300" />
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[1.8rem]">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-4 right-0 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg transform translate-y-2 opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-primary-light">
                <Camera className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </label>
            </div>
            <h3 className="text-xl font-black dark:text-white">{profile?.full_name || 'Usuário'}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Nível: {profile?.role}</p>

            <div className="w-full h-[1px] bg-slate-50 dark:bg-slate-700 my-8"></div>

            <div className="w-full space-y-4 text-left">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs font-bold dark:text-slate-300">Conta Verificada</span>
                </div>
                <Verified className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-bold dark:text-slate-300">Notificações</span>
                </div>
                <div className="w-8 h-4 bg-primary rounded-full relative">
                  <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Form */}
          <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50">
            <h3 className="text-lg font-black dark:text-white mb-8 flex items-center gap-3">
              <UserIcon className="w-5 h-5 text-primary-light" />
              Dados do Perfil
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary-light dark:text-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo/Função</label>
                <input
                  type="text"
                  value={profile?.role || ''}
                  disabled
                  className="w-full p-4 bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp de Recuperação (com 55)</label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                    placeholder="55..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary-light dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-8 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Salvar Perfil
            </button>
          </form>

          {/* Security Form */}
          <form onSubmit={handleUpdateAuth} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50">
            <h3 className="text-lg font-black dark:text-white mb-8 flex items-center gap-3">
              <Lock className="w-5 h-5 text-rose-500" />
              Segurança e Acesso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail da Conta</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary-light dark:text-white text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Deixe em branco para manter"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary-light dark:text-white text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary-light dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-8 px-8 py-4 bg-slate-900 dark:bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              Atualizar Acesso
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default SettingsView;
