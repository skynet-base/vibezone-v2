import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';
import { modalVariants } from '../../lib/animations';

export const SSHHostModal: React.FC = () => {
  const open = useSessionStore((s) => s.sshHostModalOpen);
  const setOpen = useSessionStore((s) => s.setSshHostModalOpen);
  const sshHosts = useSessionStore((s) => s.sshHosts);
  const showConfirm = useSessionStore((s) => s.showConfirm);
  const { addSshHost, removeSshHost, testSshHost } = useIPC();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [identityFile, setIdentityFile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; error?: string } | null>(null);

  const resetForm = () => {
    setName('');
    setHostname('');
    setPort('22');
    setUsername('');
    setIdentityFile('');
    setShowForm(false);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
    setTestResult(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hostname.trim() || !username.trim()) return;
    setSubmitting(true);
    try {
      await addSshHost({
        name: name.trim(),
        hostname: hostname.trim(),
        port: parseInt(port) || 22,
        username: username.trim(),
        identityFile: identityFile.trim() || undefined,
      });
      resetForm();
    } catch (err) {
      console.error('Failed to add SSH host:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async (hostId: string) => {
    setTestingId(hostId);
    setTestResult(null);
    try {
      const result = await testSshHost(hostId);
      setTestResult({ id: hostId, ...result });
    } catch (err) {
      setTestResult({ id: hostId, success: false, error: String(err) });
    } finally {
      setTestingId(null);
    }
  };

  const handleRemove = async (hostId: string) => {
    const host = sshHosts.find((h) => h.id === hostId);
    const ok = await showConfirm({
      title: 'SSH Host Kaldir',
      message: `"${host?.name ?? hostId}" adli SSH host kaldirilacak. Bu islem geri alinamaz.`,
      confirmText: 'Kaldir',
      variant: 'danger',
    });
    if (!ok) return;
    await removeSshHost(hostId);
    if (testResult?.id === hostId) setTestResult(null);
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="modal-content neon-border-purple"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-vz-text">SSH Hosts</h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-vz-red/20 text-vz-muted hover:text-vz-red transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 12 12">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Host list */}
        <div className="space-y-2 mb-4">
          {sshHosts.length === 0 && (
            <p className="text-xs text-vz-muted text-center py-4">No SSH hosts configured.</p>
          )}
          {sshHosts.map((host) => (
            <div
              key={host.id}
              className="flex items-center gap-3 p-3 glass-1 rounded-lg hover:border-vz-border-glow transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-vz-text">{host.name}</div>
                <div className="text-xs text-vz-muted font-mono">
                  {host.username}@{host.hostname}:{host.port}
                </div>
                {!host.isManual && (
                  <span className="text-[9px] text-vz-amber bg-vz-amber/10 px-1 rounded mt-0.5 inline-block">
                    from ssh config
                  </span>
                )}
              </div>

              {/* Status indicator */}
              {testResult?.id === host.id && (
                <span className={`flex items-center gap-1 text-[10px] ${testResult.success ? 'text-vz-green' : 'text-vz-red'}`}>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      testResult.success ? 'bg-vz-green shadow-neon-green' : 'bg-vz-red shadow-neon-pink'
                    }`}
                  />
                  {testResult.success ? 'Connected' : testResult.error || 'Failed'}
                </span>
              )}

              <button
                onClick={() => handleTest(host.id)}
                disabled={testingId === host.id}
                className="btn-secondary text-xs py-1 px-2 disabled:opacity-40"
              >
                {testingId === host.id ? 'Testing...' : 'Test'}
              </button>
              <button
                onClick={() => handleRemove(host.id)}
                className="p-1.5 rounded hover:bg-vz-red/20 text-vz-muted hover:text-vz-red transition-colors"
                title="Remove"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add form toggle */}
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="btn-primary w-full">
            Add SSH Host
          </button>
        ) : (
          <form onSubmit={handleAdd} className="space-y-3 border-t border-vz-border pt-4">
            <div className="text-xs text-vz-muted font-medium mb-2">Add New Host</div>

            <div>
              <label className="block text-xs text-vz-muted mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-cyber"
                placeholder="my-server"
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs text-vz-muted mb-1">Hostname</label>
                <input
                  type="text"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  className="input-cyber"
                  placeholder="192.168.1.100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-vz-muted mb-1">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="input-cyber"
                  min="1"
                  max="65535"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-vz-muted mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-cyber"
                placeholder="root"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-vz-muted mb-1">Identity File (optional)</label>
              <input
                type="text"
                value={identityFile}
                onChange={(e) => setIdentityFile(e.target.value)}
                className="input-cyber"
                placeholder="~/.ssh/id_rsa"
              />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1 disabled:opacity-40"
              >
                {submitting ? 'Adding...' : 'Add Host'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
