/**
 * @fileoverview Settings Page
 * @description Application settings for API configuration, cloud sync, and cloud processing.
 *
 * @module pages/SettingsPage
 * @author Marcelino Saad
 * @version 1.1.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Settings,
  Server,
  Key,
  Save,
  RefreshCw,
  Shield,
  Database,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  Cloud,
  CloudOff,
  Clock,
  Upload,
  Play,
} from 'lucide-react';
import { Card, Button, Input } from '../components/ui';
import { cn } from '../utils/helpers';
import {
  verifyAuth,
  checkServerHealth,
  selectServerHealth,
  selectAuthLoading,
} from '../store/slices/authSlice';
import { showSuccess, showError } from '../store/slices/uiSlice';
import { STORAGE_KEYS, API_CONFIG, APP_CONFIG } from '../config';
import { getSettings, updateSettings, triggerSync } from '../services/settingsService';

/* ============================================================
 * HEALTH INDICATOR COMPONENT
 * ============================================================ */

function HealthIndicator({ status, label }) {
  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'unhealthy':
      case 'error':
        return <XCircle className="w-5 h-5 text-danger-500" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'text-success-600';
      case 'unhealthy':
      case 'error':
        return 'text-danger-600';
      case 'checking':
        return 'text-primary-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusIcon()}
      <span className={cn('font-medium capitalize', getStatusColor())}>
        {status || 'Unknown'}
      </span>
      {label && <span className="text-gray-400">- {label}</span>}
    </div>
  );
}

/* ============================================================
 * TOGGLE SWITCH COMPONENT
 * ============================================================ */

function ToggleSwitch({ enabled, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        enabled ? 'bg-primary-600' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      aria-pressed={enabled}
      aria-label={label}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

/* ============================================================
 * SETTINGS PAGE COMPONENT
 * ============================================================ */

export function SettingsPage() {
  const dispatch = useDispatch();
  
  const serverHealth = useSelector(selectServerHealth);
  const loading = useSelector(selectAuthLoading);

  // API Configuration State
  const [apiUrl, setApiUrl] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Cloud Settings State
  const [cloudSettings, setCloudSettings] = useState(null);
  const [cloudSettingsLoading, setCloudSettingsLoading] = useState(true);
  const [cloudSettingsSaving, setCloudSettingsSaving] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  // Cloud Settings Form State
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [cloudSyncInterval, setCloudSyncInterval] = useState(12);
  const [cloudProcessingEnabled, setCloudProcessingEnabled] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem(STORAGE_KEYS.API_URL) || API_CONFIG.BASE_URL;
    const savedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || '';
    setApiUrl(savedUrl);
    setAdminToken(savedToken);
  }, []);

  // Check server health on mount
  useEffect(() => {
    dispatch(checkServerHealth());
  }, [dispatch]);

  // Fetch cloud settings from server
  const fetchCloudSettings = useCallback(async () => {
    setCloudSettingsLoading(true);
    try {
      const result = await getSettings();
      if (result.success && result.data) {
        setCloudSettings(result.data);
        setCloudSyncEnabled(result.data.cloudSync?.enabled ?? false);
        setCloudSyncInterval(result.data.cloudSync?.intervalHours ?? 12);
        setCloudProcessingEnabled(result.data.cloudProcessing?.enabled ?? true);
      }
    } catch (err) {
      console.error('Failed to fetch cloud settings:', err);
    } finally {
      setCloudSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCloudSettings();
  }, [fetchCloudSettings]);

  // Save cloud settings
  const handleSaveCloudSettings = async () => {
    setCloudSettingsSaving(true);
    try {
      const result = await updateSettings({
        cloudSync: {
          enabled: cloudSyncEnabled,
          intervalHours: parseInt(cloudSyncInterval, 10),
        },
        cloudProcessing: {
          enabled: cloudProcessingEnabled,
          disabledReason: !cloudProcessingEnabled ? 'Disabled by admin' : null,
        },
      });
      
      if (result.success) {
        setCloudSettings(result.data);
        dispatch(showSuccess('Cloud settings saved successfully'));
      } else {
        throw new Error(result.error || 'Failed to save cloud settings');
      }
    } catch (err) {
      dispatch(showError(err.message || 'Failed to save cloud settings'));
    } finally {
      setCloudSettingsSaving(false);
    }
  };

  // Trigger manual sync
  const handleTriggerSync = async () => {
    setSyncInProgress(true);
    try {
      const result = await triggerSync();
      if (result.success && result.data?.success) {
        dispatch(showSuccess(`Cloud sync completed! ${result.data.totalSynced} documents synced.`));
        fetchCloudSettings(); // Refresh to show updated last sync time
      } else {
        const reason = result.data?.message || result.error || 'Sync failed';
        dispatch(showError(reason));
      }
    } catch (err) {
      dispatch(showError(err.message || 'Failed to trigger sync'));
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate URL format
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        throw new Error('API URL must start with http:// or https://');
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.API_URL, apiUrl);
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, adminToken);

      dispatch(showSuccess('Settings saved successfully'));
      
      // Verify the new settings
      dispatch(checkServerHealth());
      if (adminToken) {
        dispatch(verifyAuth());
      }
    } catch (err) {
      dispatch(showError(err.message || 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Temporarily use the new URL for testing
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        dispatch(showSuccess('Connection successful!'));
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (err) {
      dispatch(showError(`Connection failed: ${err.message}`));
    } finally {
      setTesting(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!adminToken) {
      dispatch(showError('Please enter an admin token first'));
      return;
    }

    try {
      await dispatch(verifyAuth()).unwrap();
      dispatch(showSuccess('Token verified successfully!'));
    } catch (err) {
      dispatch(showError(err || 'Token verification failed'));
    }
  };

  const handleRefreshHealth = () => {
    dispatch(checkServerHealth());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">
            Configure API connection and application preferences
          </p>
        </div>
      </div>

      {/* Server Health */}
      <Card title="Server Status">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Server className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Server Status</p>
                <HealthIndicator status={serverHealth?.status} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Database className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Database</p>
                <HealthIndicator status={serverHealth?.database} label={serverHealth?.databaseName} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-lg",
                cloudSettings?.cloudProcessing?.enabled ? "bg-success-100" : "bg-gray-100"
              )}>
                {cloudSettings?.cloudProcessing?.enabled ? (
                  <Upload className="w-6 h-6 text-success-600" />
                ) : (
                  <CloudOff className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Cloud Processing</p>
                <p className={cn(
                  "text-sm font-medium",
                  cloudSettings?.cloudProcessing?.enabled ? "text-success-600" : "text-gray-400"
                )}>
                  {cloudSettings?.cloudProcessing?.enabled ? 'Active' : 'Disabled'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-lg",
                cloudSettings?.cloudSync?.enabled ? "bg-primary-100" : "bg-gray-100"
              )}>
                {cloudSettings?.cloudSync?.enabled ? (
                  <Cloud className="w-6 h-6 text-primary-600" />
                ) : (
                  <CloudOff className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Cloud Sync</p>
                <p className={cn(
                  "text-sm font-medium",
                  cloudSettings?.cloudSync?.enabled ? "text-primary-600" : "text-gray-400"
                )}>
                  {cloudSettings?.cloudSync?.enabled 
                    ? `Every ${cloudSettings?.cloudSync?.intervalHours}h` 
                    : 'Disabled'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              size="small"
              onClick={handleRefreshHealth}
              disabled={loading}
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Refresh Status
            </Button>
          </div>
        </div>
      </Card>

      {/* API Configuration */}
      <Card title="API Configuration">
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <Input
              label="API Server URL"
              placeholder="http://localhost:3000"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              icon={<Globe className="w-4 h-4" />}
              hint="The base URL of your EES backend server"
            />
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="small"
                onClick={handleTestConnection}
                loading={testing}
              >
                Test Connection
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <Input
              label="Admin Token"
              type="password"
              placeholder="Enter your admin token"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              icon={<Key className="w-4 h-4" />}
              hint="Token for admin API authentication (x-admin-auth header)"
            />
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="small"
                onClick={handleVerifyToken}
                disabled={!adminToken || loading}
              >
                <Shield className="w-4 h-4" />
                Verify Token
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setApiUrl(API_CONFIG.BASE_URL);
                setAdminToken('');
              }}
            >
              Reset to Defaults
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
            >
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Cloud Settings */}
      <Card title="Cloud Settings">
        <div className="p-6 space-y-6">
          {cloudSettingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              <span className="ml-2 text-gray-500">Loading cloud settings...</span>
            </div>
          ) : (
            <>
              {/* Cloud Processing Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-3 rounded-lg',
                    cloudProcessingEnabled ? 'bg-primary-100' : 'bg-gray-200'
                  )}>
                    {cloudProcessingEnabled ? (
                      <Upload className="w-6 h-6 text-primary-600" />
                    ) : (
                      <CloudOff className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Cloud Processing</p>
                    <p className="text-sm text-gray-500">
                      Upload images to Cloudinary and use Cloud AI for analysis
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  enabled={cloudProcessingEnabled}
                  onChange={setCloudProcessingEnabled}
                  label="Toggle cloud processing"
                />
              </div>

              {!cloudProcessingEnabled && (
                <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                  <p className="text-sm text-warning-700">
                    <strong>Note:</strong> When cloud processing is disabled, only local AI analysis will be used. 
                    Images will not be uploaded to Cloudinary.
                  </p>
                </div>
              )}

              {/* Cloud Sync Toggle */}
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-3 rounded-lg',
                      cloudSyncEnabled ? 'bg-success-100' : 'bg-gray-200'
                    )}>
                      {cloudSyncEnabled ? (
                        <Cloud className="w-6 h-6 text-success-600" />
                      ) : (
                        <CloudOff className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Cloud Database Sync</p>
                      <p className="text-sm text-gray-500">
                        Periodically sync local MongoDB to cloud MongoDB Atlas
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={cloudSyncEnabled}
                    onChange={setCloudSyncEnabled}
                    label="Toggle cloud sync"
                  />
                </div>
              </div>

              {/* Sync Interval */}
              {cloudSyncEnabled && (
                <div className="pl-4 border-l-2 border-primary-200">
                  <div className="flex items-center gap-4">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sync Interval (hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={cloudSyncInterval}
                        onChange={(e) => setCloudSyncInterval(Math.max(1, Math.min(168, parseInt(e.target.value, 10) || 1)))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Valid range: 1-168 hours (1 hour to 1 week)
                      </p>
                    </div>
                  </div>

                  {/* Last Sync Info */}
                  {cloudSettings?.cloudSync?.lastSyncAt && (
                    <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Last Sync:</strong>{' '}
                        {new Date(cloudSettings.cloudSync.lastSyncAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Status:</strong>{' '}
                        <span className={cn(
                          'font-medium',
                          cloudSettings.cloudSync.lastSyncStatus === 'success' ? 'text-success-600' : 'text-danger-600'
                        )}>
                          {cloudSettings.cloudSync.lastSyncStatus || 'Unknown'}
                        </span>
                      </p>
                      {cloudSettings.cloudSync.lastSyncDuration && (
                        <p className="text-sm text-gray-600">
                          <strong>Duration:</strong> {cloudSettings.cloudSync.lastSyncDuration}ms
                        </p>
                      )}
                    </div>
                  )}

                  {/* Manual Sync Button */}
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleTriggerSync}
                      loading={syncInProgress}
                      disabled={!cloudSyncEnabled}
                    >
                      <Play className="w-4 h-4" />
                      Trigger Sync Now
                    </Button>
                  </div>
                </div>
              )}

              {/* Save Cloud Settings Button */}
              <div className="border-t border-gray-100 pt-6 flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSaveCloudSettings}
                  loading={cloudSettingsSaving}
                >
                  <Save className="w-4 h-4" />
                  Save Cloud Settings
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Application Info */}
      <Card title="Application Information">
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Application</p>
              <p className="font-medium text-gray-900">{APP_CONFIG.NAME}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Version</p>
              <p className="font-medium text-gray-900">{APP_CONFIG.VERSION}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Environment</p>
              <p className="font-medium text-gray-900">
                {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Port</p>
              <p className="font-medium text-gray-900">{APP_CONFIG.PORT}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Links */}
      <Card title="Quick Links">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href={`${apiUrl}/health`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="p-2 bg-primary-100 rounded-lg">
              <Server className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Server Health</p>
              <p className="text-sm text-gray-500">Check server health status</p>
            </div>
          </a>
          <a
            href={APP_CONFIG.SCREENS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="p-2 bg-success-100 rounded-lg">
              <Globe className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Screen Display</p>
              <p className="text-sm text-gray-500">Open evacuation screens</p>
            </div>
          </a>
          <a
            href={APP_CONFIG.MOCK_SERVICES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="p-2 bg-warning-100 rounded-lg">
              <Database className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Mock Services</p>
              <p className="text-sm text-gray-500">Open mock AI services</p>
            </div>
          </a>
        </div>
      </Card>
    </div>
  );
}

export default SettingsPage;
