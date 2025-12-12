
import React, { useState } from 'react';
import {
  User,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Link,
  Copy,
  Play,
  MessageCircle,
  Camera,
  Upload,
  CalendarDays
} from 'lucide-react';
import { UserRole, OnboardingData } from '../types';
import { supabase } from '../src/lib/supabase';

interface OnboardingProps {
  userRole: UserRole;
  onFinish: (data: OnboardingData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ userRole, onFinish }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    userName: '',
    coupleName: '',
    monthlyIncome: '',
    incomeReceiptDate: '',
    riskProfile: 'medium',
    calendarConnected: false,
    profileImage: undefined
  });
  const [inviteLink, setInviteLink] = useState('');

  // Generate a fake invite link on mount if P1
  React.useEffect(() => {
    if (userRole === 'P1') {
      setInviteLink(`https://app.gossipcouple.com/invite/${Math.random().toString(36).substring(7)}`);
    }
  }, [userRole]);

  const handleNext = () => {
    setStep(step + 1);
  };

  // --- SUPABASE PERSISTENCE ---

  const uploadAvatar = async (base64Image: string, userId: string): Promise<string | null> => {
    try {
      // Convert Base64 to Blob
      const res = await fetch(base64Image);
      const blob = await res.blob();
      const fileName = `${userId}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error("Avatar Upload Error:", err);
      return null;
    }
  };

  const handleFinish = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // 1. Upload Image (if exists)
      let avatarUrl = data.profileImage;
      if (data.profileImage && data.profileImage.startsWith('data:')) {
        const uploadedUrl = await uploadAvatar(data.profileImage, user.id);
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      // 2. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.userName,
          income: parseFloat(data.monthlyIncome || '0'),
          income_date: parseInt(data.incomeReceiptDate || '1'),
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Update Couple (P1 only usually, but P2 can edit risk if we want. Spec says P1 sets Risk)
      // We need couple_id. Let's fetch it or user has it? 
      // We can get it from profile, but let's assume we are just updating the couple linked to this user.
      if (userRole === 'P1' && data.coupleName) {
        const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single();
        if (profile?.couple_id) {
          await supabase
            .from('couples')
            .update({
              name: data.coupleName,
              financial_risk_profile: data.riskProfile
            })
            .eq('id', profile.couple_id);
        }
      }

      // 4. Finish
      onFinish(data); // This triggers parent to re-fetch/redirect

    } catch (err) {
      console.error("Onboarding Save Error:", err);
      alert("Erro ao salvar dados. Tente novamente.");
    }
  };

  const renderStepIndicator = () => {
    const totalSteps = userRole === 'P1' ? 8 : 5; // Added 1 step for Photo
    return (
      <div className="flex gap-2 mb-8 justify-center">
        {[...Array(totalSteps)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 <= step ? 'w-8 bg-primary-mid' : 'w-2 bg-gray-200'
              }`}
          />
        ))}
      </div>
    );
  };

  // --- STEP CONTENT RENDERERS ---

  // 1. Basic Info (Both)
  const renderNameStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-start">
          <User size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {userRole === 'P2' ? 'Bem-vindo(a) ao time!' : 'Vamos começar!'}
        </h2>
        <p className="text-gray-500 mt-2">
          {userRole === 'P2'
            ? 'Seu parceiro(a) te convidou para gerenciar as finanças juntos.'
            : 'Primeiro, como você gostaria de ser chamado?'}
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seu Nome</label>
        <input
          type="text"
          value={data.userName}
          onChange={(e) => setData({ ...data, userName: e.target.value })}
          className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-lg"
          placeholder="Ex: Alex"
          autoFocus
        />
      </div>

      <button
        onClick={handleNext}
        disabled={!data.userName}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 2. Profile Photo Step (Both - NEW)
  const renderPhotoStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
          <Camera size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sua Foto de Perfil</h2>
        <p className="text-gray-500 mt-2">Adicione uma foto para personalizar sua experiência. (Opcional)</p>
      </div>

      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
            {data.profileImage ? (
              <img src={data.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-gray-300" />
            )}
          </div>
          <label className="absolute bottom-0 right-0 bg-primary-mid text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-primary-start transition-all hover:scale-110">
            <Upload size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleNext}
          className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors"
        >
          Pular
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {data.profileImage ? 'Ficou ótimo!' : 'Continuar'} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  // 3. Couple Info (P1 Only)
  const renderCoupleStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-start">
          <Users size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Nome do Casal</h2>
        <p className="text-gray-500 mt-2">Como vocês querem chamar o time financeiro de vocês?</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Casal</label>
        <input
          type="text"
          value={data.coupleName}
          onChange={(e) => setData({ ...data, coupleName: e.target.value })}
          className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-lg"
          placeholder="Ex: Casal Power, Família Silva"
        />
      </div>

      <button
        onClick={handleNext}
        disabled={!data.coupleName}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 4. Calendar Connection (Both)
  const renderCalendarStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
          <Calendar size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sincronizar Agenda</h2>
        <p className="text-gray-500 mt-2">Conecte seu Google Calendar para que a IA possa organizar seus compromissos.</p>
      </div>

      <div
        onClick={() => setData({ ...data, calendarConnected: !data.calendarConnected })}
        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${data.calendarConnected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
      >
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-800">Google Calendar</h4>
          <p className="text-xs text-gray-500">{data.calendarConnected ? 'Conectado com sucesso' : 'Toque para conectar'}</p>
        </div>
        {data.calendarConnected && <CheckCircle className="text-green-600" size={24} />}
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
      >
        {data.calendarConnected ? 'Continuar' : 'Pular por enquanto'} <ArrowRight size={20} />
      </button>
    </div>
  );

  // 5. Risk Profile (P1 Only)
  const renderRiskStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
          <TrendingUp size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Perfil de Investidor</h2>
        <p className="text-gray-500 mt-2">Qual a tolerância a risco do casal para investimentos?</p>
      </div>

      <div className="space-y-3">
        {['low', 'medium', 'high'].map((risk) => (
          <div
            key={risk}
            onClick={() => setData({ ...data, riskProfile: risk as any })}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${data.riskProfile === risk ? 'border-primary-mid bg-pink-50' : 'border-gray-100 bg-white'}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${data.riskProfile === risk ? 'border-primary-mid' : 'border-gray-300'}`}>
              {data.riskProfile === risk && <div className="w-2 h-2 bg-primary-mid rounded-full" />}
            </div>
            <div>
              <h4 className="font-bold text-gray-800 capitalize">
                {risk === 'low' ? 'Conservador' : risk === 'medium' ? 'Moderado' : 'Arrojado'}
              </h4>
              <p className="text-xs text-gray-500">
                {risk === 'low' ? 'Segurança acima de tudo.' : risk === 'medium' ? 'Equilíbrio entre risco e retorno.' : 'Foco em alta rentabilidade.'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 6. Income (Both)
  const renderIncomeStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
          <DollarSign size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Renda Mensal</h2>
        <p className="text-gray-500 mt-2">Para ajudar a IA a planejar o orçamento.</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor da Renda</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
          <input
            type="number"
            value={data.monthlyIncome}
            onChange={(e) => setData({ ...data, monthlyIncome: e.target.value })}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-lg font-bold text-gray-800"
            placeholder="0,00"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia do Recebimento</label>
        <div className="relative">
          <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="number"
            min="1"
            max="31"
            value={data.incomeReceiptDate}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if ((val >= 1 && val <= 31) || e.target.value === '') {
                setData({ ...data, incomeReceiptDate: e.target.value });
              }
            }}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-lg font-bold text-gray-800"
            placeholder="Dia (1-31)"
          />
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!data.monthlyIncome || !data.incomeReceiptDate}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 7. Invite (P1 Only)
  const renderInviteStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-start/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-start">
          <Link size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Convide seu Amor</h2>
        <p className="text-gray-500 mt-2">Envie o link para conectar as contas.</p>
      </div>

      <div className="bg-gray-100 p-4 rounded-xl break-all text-xs text-gray-500 font-mono text-center">
        {inviteLink}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            navigator.clipboard.writeText(inviteLink);
            alert("Link copiado!");
          }}
          className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <Copy size={18} /> Copiar
        </button>
        <button
          onClick={() => {
            const msg = `Oi! Acabei de criar nossa conta no Gossip Couple para o casal '${data.coupleName}'. Entra aí pra gente organizar tudo: ${inviteLink}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
          }}
          className="py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} /> WhatsApp
        </button>
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
      >
        Já enviei, continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 8. Tutorial (Both)
  const renderVideoStep = () => (
    <div className="space-y-6 animate-fade-in text-center">
      <h2 className="text-2xl font-bold text-gray-900">Como usar a plataforma</h2>
      <p className="text-gray-500 -mt-2 mb-4">Um guia rápido de 1 minuto.</p>

      <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-xl group cursor-pointer">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play size={32} className="text-white fill-white ml-1" />
          </div>
        </div>
        <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" className="w-full h-full object-cover opacity-60" alt="Tutorial" />
      </div>

      <button
        onClick={handleFinish}
        className="w-full py-4 bg-gradient-to-r from-primary-start to-primary-mid text-white font-bold rounded-xl shadow-lg hover:shadow-primary-start/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
      >
        Ir para o Dashboard <ArrowRight size={20} />
      </button>
    </div>
  );

  // Main Logic to choose step based on User Role
  let content;
  if (userRole === 'P1') {
    switch (step) {
      case 1: content = renderNameStep(); break;
      case 2: content = renderPhotoStep(); break;
      case 3: content = renderCoupleStep(); break;
      case 4: content = renderCalendarStep(); break;
      case 5: content = renderRiskStep(); break;
      case 6: content = renderIncomeStep(); break;
      case 7: content = renderInviteStep(); break;
      case 8: content = renderVideoStep(); break;
      default: content = <div>Erro</div>;
    }
  } else {
    // P2 Flow
    switch (step) {
      case 1: content = renderNameStep(); break;
      case 2: content = renderPhotoStep(); break;
      case 3: content = renderIncomeStep(); break;
      case 4: content = renderCalendarStep(); break;
      case 5: content = renderVideoStep(); break;
      default: content = <div>Erro</div>;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
        {renderStepIndicator()}
        {content}
      </div>
    </div>
  );
};

export default Onboarding;
