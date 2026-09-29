import { useState } from 'react'
import { Check, Copy, Eye, EyeOff, Radio, Server } from 'lucide-react'
import { toast } from 'sonner'

import {
  EditableSection,
  SectionEditForm,
} from '@/components/meeting/editable-section'
import type {
  EditScope,
  SectionProps,
} from '@/components/meeting/editable-section'
import {
  SettingSummary,
  SettingSwitch,
} from '@/components/meeting/setting-rows'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import type { LiveStreamSettings, StreamPlatform } from '@/lib/demo-meetings'
import type { SaveScope } from '@/lib/sessions'

/** Ingest defaults per platform; custom and LinkedIn need the URL pasted in. */
export const PLATFORMS: Record<
  StreamPlatform,
  { label: string; serverUrl: string; keyHelp: string }
> = {
  youtube: {
    label: 'YouTube Live',
    serverUrl: 'rtmp://a.rtmp.youtube.com/live2',
    keyHelp: 'YouTube Studio → Go live → Stream key',
  },
  linkedin: {
    label: 'LinkedIn Live',
    serverUrl: '',
    keyHelp: 'LinkedIn event → Stream settings → Stream key',
  },
  facebook: {
    label: 'Facebook Live',
    serverUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    keyHelp: 'Live Producer → Streaming software → Stream key',
  },
  twitch: {
    label: 'Twitch',
    serverUrl: 'rtmp://live.twitch.tv/app',
    keyHelp: 'Creator Dashboard → Settings → Stream → Primary stream key',
  },
  custom: {
    label: 'Custom RTMP',
    serverUrl: '',
    keyHelp: 'From your streaming server or CDN',
  },
}

const RTMP_URL = /^rtmps?:\/\/\S+$/i

function isPlatform(value: string): value is StreamPlatform {
  return value in PLATFORMS
}

function maskKey(key: string) {
  return key.length <= 4 ? '••••' : `${'•'.repeat(8)}${key.slice(-4)}`
}

export function LiveStreamSection({
  value,
  canEdit,
  isEditing,
  editScope,
  override,
  onEdit,
  onCancel,
  onSave,
}: SectionProps<LiveStreamSettings>) {
  const platform = PLATFORMS[value.platform]

  return (
    <EditableSection
      id="live-stream"
      title="Live stream"
      description={
        value.enabled
          ? `Broadcasting to ${platform.label}`
          : 'Broadcast to YouTube, LinkedIn, Facebook, Twitch or any RTMP server'
      }
      canEdit={canEdit}
      isEditing={isEditing}
      onEdit={onEdit}
      override={override}
    >
      {isEditing ? (
        <LiveStreamForm
          initial={value}
          editScope={editScope}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : !value.enabled ? (
        <ul className="-my-2.5">
          <SettingSummary
            icon={Radio}
            label="Live stream"
            value="Off"
            isOn={false}
          />
        </ul>
      ) : (
        <ul className="-my-2.5 divide-y">
          <SettingSummary
            icon={Radio}
            label="Platform"
            value={platform.label}
          />
          {/* Ingest details are for hosts only. */}
          {canEdit && (
            <>
              <SettingSummary
                icon={Server}
                label="Server"
                value={value.serverUrl || 'Not set'}
                isOn={value.serverUrl !== ''}
              />
              <SettingSummary
                icon={Eye}
                label="Stream key"
                value={value.streamKey ? maskKey(value.streamKey) : 'Not set'}
                isOn={value.streamKey !== ''}
              />
            </>
          )}
        </ul>
      )}
    </EditableSection>
  )
}

function LiveStreamForm({
  initial,
  editScope,
  onCancel,
  onSave,
}: {
  initial: LiveStreamSettings
  editScope: EditScope
  onCancel: () => void
  onSave: (value: LiveStreamSettings, scope: SaveScope) => void
}) {
  const [draft, setDraft] = useState(initial)
  const [showKey, setShowKey] = useState(false)
  const { copied, copy } = useCopyToClipboard()

  const urlInvalid = draft.enabled && !RTMP_URL.test(draft.serverUrl.trim())
  const keyMissing = draft.enabled && draft.streamKey.trim() === ''
  const platform = PLATFORMS[draft.platform]

  function changePlatform(next: StreamPlatform) {
    // Swap in the new platform's server unless the host typed their own.
    const typedCustomUrl =
      draft.serverUrl !== '' &&
      draft.serverUrl !== PLATFORMS[draft.platform].serverUrl
    setDraft({
      ...draft,
      platform: next,
      serverUrl: typedCustomUrl ? draft.serverUrl : PLATFORMS[next].serverUrl,
    })
  }

  return (
    <SectionEditForm
      editScope={editScope}
      allowFollowing
      onCancel={onCancel}
      onSave={(scope) =>
        onSave(
          {
            ...draft,
            serverUrl: draft.serverUrl.trim(),
            streamKey: draft.streamKey.trim(),
          },
          scope,
        )
      }
      saveDisabled={urlInvalid || keyMissing}
    >
      <div className="rounded-lg border">
        <SettingSwitch
          id="stream-enabled"
          label="Stream this meeting"
          description="Only hosts and speakers appear on the stream. Viewers watch on the platform."
          checked={draft.enabled}
          onCheckedChange={(enabled) => setDraft({ ...draft, enabled })}
        />
      </div>

      {draft.enabled && (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="stream-platform">Platform</Label>
            <Select
              value={draft.platform}
              onValueChange={(value) => {
                if (isPlatform(value)) changePlatform(value)
              }}
            >
              <SelectTrigger id="stream-platform" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORMS).map(([value, option]) => (
                  <SelectItem key={value} value={value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stream-url">RTMP server URL</Label>
            <Input
              id="stream-url"
              className="font-mono text-xs"
              placeholder="rtmp://…"
              value={draft.serverUrl}
              aria-invalid={urlInvalid}
              aria-describedby="stream-url-hint"
              onChange={(event) =>
                setDraft({ ...draft, serverUrl: event.target.value })
              }
            />
            <p
              id="stream-url-hint"
              className={
                urlInvalid
                  ? 'text-xs text-destructive-foreground'
                  : 'text-xs text-muted-foreground'
              }
            >
              {urlInvalid
                ? 'Enter a URL starting with rtmp:// or rtmps://'
                : platform.serverUrl
                  ? `Default ${platform.label} ingest. Change it only if the platform gave you another.`
                  : `Paste the server URL from ${platform.label}.`}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stream-key">Stream key</Label>
            <div className="flex gap-2">
              <Input
                id="stream-key"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-xs"
                placeholder="Paste your stream key"
                value={draft.streamKey}
                aria-describedby="stream-key-hint"
                onChange={(event) =>
                  setDraft({ ...draft, streamKey: event.target.value })
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={showKey ? 'Hide stream key' : 'Show stream key'}
                aria-pressed={showKey}
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={copied ? 'Stream key copied' : 'Copy stream key'}
                disabled={draft.streamKey === ''}
                onClick={() => {
                  void copy(draft.streamKey)
                  toast.success('Stream key copied')
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <p id="stream-key-hint" className="text-xs text-muted-foreground">
              {keyMissing
                ? `Needed to go live. Find it in ${platform.keyHelp}.`
                : `From ${platform.keyHelp}. Treat it like a password.`}
            </p>
          </div>
        </div>
      )}
    </SectionEditForm>
  )
}
