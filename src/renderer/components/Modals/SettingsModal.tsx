import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';
import { modalVariants } from '../../lib/animations';
import { NODE_CONFIG } from '@shared/types';
import type { NodeId } from '@shared/types';

export const SettingsModal: React.FC = () => {
  const open = useSessionStore((s) => s.settingsModalOpen);
  const setOpen = useSessionStore((s) => s.setSettingsModalOpen);
  const settings = useSessionStore((s) => s.settings);
  const teamProjectPath = useSessionStore((s) => s.teamProjectPath);
  const { updateSettings, setupHook, uninstallHook, getHookStatus } = useIPC();

  const [hookStatus, setHookStatus] = useState<{ enabled: boolean; port?: number } | null>(null);
  const [hookLoading, setHookLoading] = useState(false);

  useEffect(() => {
    if (open) {
      getHookStatus().then(setHookStatus);
    }
  }, [open]);

  const handleClose = () => setOpen(false);

  const handleToggle = async (key: 'autoStart' | 'minimizeToTray' | 'particlesEnabled', value: boolean) => {
    await updateSettings({ [key]: value });
  };

  const handleQuality = async (quality: 'low' | 'medium' | 'high') => {
    await updateSettings({ quality });
  };

  const handleHookSetup = async () => {
    setHookLoading(true);
    try {
      await setupHook();
      const status = await getHookStatus();
      setHookStatus(status);
    } catch (err) {
      console.error('Hook setup failed:', err);
    } finally {
      setHookLoading(false);
    }
  };

  const handleHookUninstall = async () => {
    setHookLoading(true);
    try {
      await uninstallHook();
      const status = await getHookStatus();
      setHookStatus(status);
    } catch (err) {
      console.error('Hook uninstall failed:', err);
    } finally {
      setHookLoading(false);
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

  if (!open || !settings) return null;

  const QUALITY_DESCRIPTIONS: Record<string, string> = {
    low: 'Hizli render, efekt yok',
    medium: 'Bloom efekti',
    high: 'Tam efektler',
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="modal-content neon-border-green"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-vz-text">Ayarlar</h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-vz-red/20 text-vz-muted hover:text-vz-red transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 12 12">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* General */}
          <section>
            <h3 className="text-xs text-vz-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-[3px] h-3.5 rounded-full bg-vz-cyan" />
              Genel
            </h3>
            <div className="space-y-3">
              <ToggleRow
                label="Bilgisayar acildiginda otomatik baslat"
                value={settings.autoStart}
                onChange={(v) => handleToggle('autoStart', v)}
              />
              <ToggleRow
                label="Kapatinca sistem tepsisine kucult"
                value={settings.minimizeToTray}
                onChange={(v) => handleToggle('minimizeToTray', v)}
              />
            </div>
          </section>

          {/* Pixel Office */}
          <section>
            <h3 className="text-xs text-vz-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-[3px] h-3.5 rounded-full bg-vz-purple" />
              Gorunum
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-vz-text mb-2">Grafik Kalitesi (dusuk = daha hizli)</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'low' as const, label: 'Dusuk' },
                    { value: 'medium' as const, label: 'Orta' },
                    { value: 'high' as const, label: 'Yuksek' },
                  ]).map((q) => (
                    <button
                      key={q.value}
                      onClick={() => handleQuality(q.value)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all flex flex-col items-center gap-0.5 ${
                        settings.quality === q.value
                          ? 'bg-vz-cyan/10 border-vz-cyan/30 text-vz-cyan'
                          : 'border-vz-border text-vz-muted hover:border-vz-muted/50'
                      }`}
                    >
                      <span>{q.label}</span>
                      <span className="text-[9px] opacity-50 font-normal">
                        {QUALITY_DESCRIPTIONS[q.value]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <ToggleRow
                label="Animasyonlu parcacik efektleri"
                value={settings.particlesEnabled}
                onChange={(v) => handleToggle('particlesEnabled', v)}
              />
            </div>
          </section>

          {/* Team Project */}
          <section>
            <h3 className="text-xs text-vz-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-[3px] h-3.5 rounded-full bg-vz-green" />
              Takim Projesi
            </h3>
            <div className="p-3 glass-1 rounded-lg">
              {teamProjectPath ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-vz-green pulse-dot" />
                    <span className="text-xs text-vz-text">Bagli</span>
                  </div>
                  <p className="text-[10px] text-vz-muted font-mono truncate">
                    {settings.teamProjectPath || teamProjectPath}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] text-vz-muted mb-2">
                    Bir takim projesi baglayarak sprint takibi ve takim agent'larini otomatik yukleyebilirsiniz.
                  </p>
                  <p className="text-[10px] text-vz-muted/60">
                    Sol panelden "Takim Projesi Ice Aktar" butonunu kullanin.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Infrastructure */}
          <section>
            <h3 className="text-xs text-vz-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-[3px] h-3.5 rounded-full bg-vz-pink" />
              Altyapi
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-vz-text mb-2">Bu Bilgisayar (Local Node)</label>
                <div className="grid grid-cols-2 gap-2">
                  {NODE_CONFIG.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => updateSettings({ localNodeId: node.id })}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                        (settings.localNodeId || 'pc1') === node.id
                          ? 'border-opacity-30 text-opacity-100'
                          : 'border-vz-border text-vz-muted hover:border-vz-muted/50'
                      }`}
                      style={{
                        borderColor: (settings.localNodeId || 'pc1') === node.id ? node.color : undefined,
                        color: (settings.localNodeId || 'pc1') === node.id ? node.color : undefined,
                        background: (settings.localNodeId || 'pc1') === node.id ? `${node.color}10` : undefined,
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: node.color }}
                      />
                      {node.name} ({node.id})
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-vz-muted/60 mt-1.5">
                  Bu ayar, hangi PC'nin yerel olarak izlenecegini belirler.
                </p>
              </div>
            </div>
          </section>

          {/* Hook */}
          <section>
            <h3 className="text-xs text-vz-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-[3px] h-3.5 rounded-full bg-vz-amber" />
              Canli Izleme (Hook)
            </h3>
            <div className="p-3 glass-1 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hookStatus?.enabled ? 'bg-vz-green pulse-dot' : 'bg-vz-muted'
                    }`}
                  />
                  <span className="text-xs text-vz-text">
                    {hookStatus?.enabled ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                {hookStatus?.port && (
                  <span className="text-[10px] text-vz-muted font-mono">
                    port {hookStatus.port}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-vz-muted mb-3">
                Agent'larin ne yaptigini canli olarak izlemenizi saglar. Arac kullanimi, tamamlama ve islem bilgilerini gercek zamanli gorursunuz.
              </p>
              {hookStatus?.enabled ? (
                <button
                  onClick={handleHookUninstall}
                  disabled={hookLoading}
                  className="btn-danger w-full text-xs disabled:opacity-40"
                >
                  {hookLoading ? 'Isleniyor...' : 'Hook Kaldir'}
                </button>
              ) : (
                <button
                  onClick={handleHookSetup}
                  disabled={hookLoading}
                  className="btn-primary w-full text-xs disabled:opacity-40"
                >
                  {hookLoading ? 'Isleniyor...' : 'Hook Kur'}
                </button>
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-vz-text">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        value ? 'bg-vz-cyan/40' : 'bg-vz-border'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
          value ? 'left-[22px] bg-vz-cyan shadow-neon-cyan' : 'left-0.5 bg-vz-muted'
        }`}
      />
    </button>
  </div>
);
