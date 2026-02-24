import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';
import { useToastStore } from '../../hooks/useToastStore';
import { modalVariants } from '../../lib/animations';
import type { AgentType, SessionLocation, AutocompleteResult, AgentCategory } from '@shared/types';
import { AGENT_INFO, TERMINAL_AGENT_TYPES, TEAM_AGENT_TYPES } from '@shared/types';

type WizardStep = 1 | 2 | 3;

export const CreateAgentModal: React.FC = () => {
  const open = useSessionStore((s) => s.createAgentModalOpen);
  const setOpen = useSessionStore((s) => s.setCreateAgentModalOpen);
  const sshHosts = useSessionStore((s) => s.sshHosts);
  const sessions = useSessionStore((s) => s.sessions);
  const { createSession, autocomplete, quickCreateShell } = useIPC();

  const [step, setStep] = useState<WizardStep>(1);
  const [choice, setChoice] = useState<'terminal' | 'ai' | null>(null);
  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('claude');
  const [category, setCategory] = useState<AgentCategory>('terminal');
  const [location, setLocation] = useState<SessionLocation>('local');
  const [sshHost, setSshHost] = useState('');
  const [cwd, setCwd] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [flags, setFlags] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const cwdInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate name based on agent type
  const getAutoName = useCallback((type: AgentType) => {
    const info = AGENT_INFO[type];
    const count = sessions.filter(s => s.agentType === type).length;
    return `${info.label}-${count + 1}`;
  }, [sessions]);

  const reset = () => {
    setStep(1);
    setChoice(null);
    setName('');
    setAgentType('claude');
    setCategory('terminal');
    setLocation('local');
    setSshHost('');
    setCwd('');
    setCustomCommand('');
    setFlags('');
    setSuggestions([]);
    setShowSuggestions(false);
    setIsTeamMember(false);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleQuickTerminal = async () => {
    handleClose();
    await quickCreateShell();
  };

  const handleChoiceTerminal = () => {
    setChoice('terminal');
    setAgentType('shell');
    setCategory('terminal');
    setName(getAutoName('shell'));
    setStep(3);
  };

  const handleChoiceAI = () => {
    setChoice('ai');
    setAgentType('claude');
    setCategory('terminal');
    setName(getAutoName('claude'));
    setStep(2);
  };

  const handleAgentTypeSelect = (type: AgentType) => {
    setAgentType(type);
    setName(getAutoName(type));
  };

  const handleTeamToggle = () => {
    const newIsTeam = !isTeamMember;
    setIsTeamMember(newIsTeam);
    if (newIsTeam) {
      setCategory('team');
      setAgentType('team-lead');
      setName(getAutoName('team-lead'));
    } else {
      setCategory('terminal');
      setAgentType('claude');
      setName(getAutoName('claude'));
    }
  };

  const handleStep2Next = () => {
    setStep(3);
  };

  const handleCwdChange = useCallback((value: string) => {
    setCwd(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await autocomplete(value);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  }, [autocomplete]);

  const handleSelectSuggestion = (result: AutocompleteResult) => {
    setCwd(result.path);
    setShowSuggestions(false);
    cwdInputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (category === 'terminal' && !cwd.trim()) return;

    setSubmitting(true);
    try {
      await createSession({
        name: name.trim(),
        agentType,
        location: category === 'team' ? 'local' : location,
        sshHost: location === 'remote' && category === 'terminal' ? sshHost : undefined,
        cwd: cwd.trim() || '.',
        customCommand: agentType === 'custom' ? customCommand.trim() : undefined,
        flags: flags.trim() || undefined,
        category,
      });
      handleClose();
    } catch (err: any) {
      useToastStore.getState().addToast({
        message: `Hata: ${err?.message || 'Agent olusturulamadi'}`,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const AGENT_DESCRIPTIONS: Partial<Record<AgentType, string>> = {
    shell: 'Gercek terminal - PowerShell veya Bash. Komut satirindan her seyi yapin.',
    claude: 'Anthropic Claude - genel amacli AI kodlama asistani',
    clawbot: 'Clawbot - alternatif AI kodlama araci',
    opencode: 'OpenCode - acik kaynakli kod asistani',
    codex: 'OpenAI Codex - kod uretimi icin optimize',
    custom: 'Kendi ozel komutunuzu calistirin',
    'team-lead': 'Projeyi yonetir, gorevleri dagitir',
    designer: 'UI/UX tasarim kararlari verir',
    frontend: 'Arayuz gelistirme uzmani',
    backend: 'Sunucu tarafi gelistirme uzmani',
    qa: 'Test ve kalite kontrolu yapar',
    devops: 'CI/CD ve altyapi islerini yonetir',
  };

  if (!open) return null;

  const agentTypes = isTeamMember ? TEAM_AGENT_TYPES : TERMINAL_AGENT_TYPES.filter(t => t !== 'shell');

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="modal-content neon-border-cyan"
        style={{ minWidth: 500, maxWidth: 560 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step === 3 && choice === 'terminal' ? 1 : (step - 1) as WizardStep)}
                className="p-1.5 rounded-full hover:bg-vz-border/30 text-vz-muted hover:text-vz-text transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-lg font-semibold text-vz-text">
              {step === 1 && 'Yeni Agent'}
              {step === 2 && 'AI Araci Secin'}
              {step === 3 && 'Ayarlar'}
            </h2>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    backgroundColor: s <= step ? '#00ccff' : 'rgba(255,255,255,0.15)',
                    boxShadow: s === step ? '0 0 6px rgba(0,204,255,0.5)' : 'none',
                  }}
                />
              ))}
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-vz-red/20 text-vz-muted hover:text-vz-red transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 12 12">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Terminal button (always visible at step 1) */}
        {step === 1 && (
          <button
            onClick={handleQuickTerminal}
            className="w-full mb-4 py-2 px-4 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,255,136,0.03))',
              border: '1px solid rgba(0,255,136,0.25)',
              color: '#00ff88',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            Hizli Terminal Ac
            <span className="text-[9px] opacity-50 ml-1">(tek tikla PowerShell)</span>
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: What do you want? */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <label className="block text-xs text-vz-muted mb-3">Ne yapmak istiyorsunuz?</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Terminal Card */}
                <button
                  onClick={handleChoiceTerminal}
                  className="group py-6 px-4 rounded-xl border border-vz-border hover:border-green-500/40 transition-all flex flex-col items-center gap-3 hover:bg-green-500/5"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all group-hover:scale-110"
                    style={{ backgroundColor: 'rgba(0,255,136,0.1)', color: '#00ff88' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-vz-text mb-1">Terminal Ac</div>
                    <div className="text-[10px] text-vz-muted leading-relaxed">
                      PowerShell veya Bash<br />Komut satiri erisimi
                    </div>
                  </div>
                </button>

                {/* AI Assistant Card */}
                <button
                  onClick={handleChoiceAI}
                  className="group py-6 px-4 rounded-xl border border-vz-border hover:border-cyan-500/40 transition-all flex flex-col items-center gap-3 hover:bg-cyan-500/5"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all group-hover:scale-110"
                    style={{ backgroundColor: 'rgba(0,204,255,0.1)', color: '#00ccff' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <circle cx="12" cy="5" r="2" />
                      <path d="M12 7v4" />
                      <line x1="8" y1="16" x2="8" y2="16" />
                      <line x1="16" y1="16" x2="16" y2="16" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-vz-text mb-1">AI Asistan Baslat</div>
                    <div className="text-[10px] text-vz-muted leading-relaxed">
                      Claude, Codex ve daha fazlasi<br />AI destekli kodlama
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Which AI tool? */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {/* Team member toggle */}
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-vz-muted">Hangi AI aracini kullanmak istiyorsunuz?</label>
                <button
                  onClick={handleTeamToggle}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                    isTeamMember
                      ? 'bg-vz-purple/10 border-vz-purple/30 text-vz-purple'
                      : 'border-vz-border text-vz-muted hover:border-vz-muted/50'
                  }`}
                >
                  {isTeamMember ? '✓ Takim Uyesi' : 'Takim Uyesi'}
                </button>
              </div>

              {/* Agent type grid - larger cards */}
              <div className={`grid gap-2 ${isTeamMember ? 'grid-cols-3' : 'grid-cols-3'}`}>
                {agentTypes.map((type) => {
                  const info = AGENT_INFO[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleAgentTypeSelect(type)}
                      className={`py-4 px-2 rounded-lg text-xs font-medium border transition-all flex flex-col items-center gap-2 ${
                        agentType === type
                          ? 'border-opacity-50'
                          : 'border-vz-border hover:border-vz-muted/50 text-vz-muted'
                      }`}
                      style={
                        agentType === type
                          ? {
                              color: info.color,
                              borderColor: info.color + '80',
                              backgroundColor: info.color + '15',
                            }
                          : undefined
                      }
                    >
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: info.color }}
                      />
                      <span>{info.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Description */}
              <p className="text-[10px] text-vz-text-secondary mt-2 pl-0.5 min-h-[1.2em]">
                {AGENT_DESCRIPTIONS[agentType]}
              </p>

              {/* Next button */}
              <button
                onClick={handleStep2Next}
                className="btn-primary w-full mt-4"
              >
                Devam
              </button>
            </motion.div>
          )}

          {/* Step 3: Configuration */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs text-vz-muted mb-1.5">Isim</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-cyber"
                    placeholder={getAutoName(agentType)}
                    autoFocus
                    required
                  />
                </div>

                {/* Location (terminal only, not for shell choice from step 1) */}
                {category === 'terminal' && choice === 'ai' && (
                  <div>
                    <label className="block text-xs text-vz-muted mb-1.5">Konum</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLocation('local')}
                        className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                          location === 'local'
                            ? 'bg-vz-green/10 border-vz-green/30 text-vz-green'
                            : 'border-vz-border text-vz-muted hover:border-vz-muted/50'
                        }`}
                      >
                        Yerel
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocation('remote')}
                        className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                          location === 'remote'
                            ? 'bg-vz-cyan/10 border-vz-cyan/30 text-vz-cyan'
                            : 'border-vz-border text-vz-muted hover:border-vz-muted/50'
                        }`}
                      >
                        Uzak (SSH)
                      </button>
                    </div>
                  </div>
                )}

                {/* SSH Host (if remote) */}
                {category === 'terminal' && location === 'remote' && choice === 'ai' && (
                  <div>
                    <label className="block text-xs text-vz-muted mb-1.5">SSH Host</label>
                    <select
                      value={sshHost}
                      onChange={(e) => setSshHost(e.target.value)}
                      className="select-cyber"
                      required
                    >
                      <option value="">Host secin...</option>
                      {sshHosts.map((host) => (
                        <option key={host.id} value={host.id}>
                          {host.name} ({host.username}@{host.hostname})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Working Directory */}
                <div className="relative">
                  <label className="block text-xs text-vz-muted mb-1.5">Proje klasoru</label>
                  <input
                    ref={cwdInputRef}
                    type="text"
                    value={cwd}
                    onChange={(e) => handleCwdChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="input-cyber"
                    placeholder="C:/Users/kullanici/projeler/benim-projem"
                    required={category === 'terminal'}
                  />

                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-20 left-0 right-0 top-full mt-1 bg-vz-surface border border-vz-border rounded-lg shadow-xl max-h-40 overflow-y-auto"
                      >
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-vz-border/30 transition-colors flex items-center gap-2"
                          >
                            {s.isDirectory ? '📁' : '📄'}
                            <span className="text-vz-text truncate">{s.name}</span>
                            {s.isProject && (
                              <span className="text-[9px] text-vz-green bg-vz-green/10 px-1 rounded ml-auto">
                                proje
                              </span>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Custom Command (if custom type) */}
                {agentType === 'custom' && (
                  <div>
                    <label className="block text-xs text-vz-muted mb-1.5">Ozel Komut</label>
                    <input
                      type="text"
                      value={customCommand}
                      onChange={(e) => setCustomCommand(e.target.value)}
                      className="input-cyber"
                      placeholder="ornegin: aider --model gpt-4o"
                      required
                    />
                  </div>
                )}

                {/* Flags (terminal AI only) */}
                {category === 'terminal' && agentType !== 'shell' && (
                  <div>
                    <label className="block text-xs text-vz-muted mb-1.5">Ek Parametreler (opsiyonel)</label>
                    <input
                      type="text"
                      value={flags}
                      onChange={(e) => setFlags(e.target.value)}
                      className="input-cyber"
                      placeholder="Bos birakilabilir"
                    />
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleClose} className="btn-secondary flex-1">
                    Iptal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !name.trim() || (category === 'terminal' && !cwd.trim())}
                    className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Olusturuluyor...' : 'Olustur'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
