import type { CoreRecommendationScenarioCode } from './recommendation-scenarios';

export interface CreatorCopy {
  headline: string;
  subheadline: string;
  description: string;
  warningText: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
}

export interface CreatorTemplate {
  id: string;
  name: string;
  description: string;
  copy: Pick<CreatorCopy, 'headline' | 'subheadline' | 'description' | 'primaryCtaLabel'>;
  groups: Array<{ title: string; description: string }>;
}

const COMMON_SUBHEADLINE = 'Playing GTA VI is only the beginning.';
export const CREATOR_SETUP_BUILDER_PATH = '/creator-setup-builder';
export const CREATOR_SETUP_GUIDE_PATH = '/creator-setup-guide';

const COMMON_CTA = {
  primaryCtaLabel: 'Build My Streaming Setup',
  primaryCtaUrl: CREATOR_SETUP_BUILDER_PATH,
  secondaryCtaLabel: 'View Creator Setup Guide',
  secondaryCtaUrl: CREATOR_SETUP_GUIDE_PATH,
};

export const CREATOR_FALLBACK: CreatorCopy = {
  headline: 'Ready to Stream GTA VI?',
  subheadline: 'Playing the game is only the beginning.',
  description:
    'Streaming, recording, editing, and multitasking require more than basic gaming performance. Start with the upgrades that solve your biggest bottleneck, then build out your audio, camera, lighting, and workspace.',
  warningText: '',
  primaryCtaLabel: 'Build My Streaming Setup',
  primaryCtaUrl: CREATOR_SETUP_BUILDER_PATH,
  secondaryCtaLabel: 'View Creator Setup Guide',
  secondaryCtaUrl: CREATOR_SETUP_GUIDE_PATH,
};

const UNKNOWN_COPY: CreatorCopy = {
  headline: 'Verify Your PC Before Building a Streaming Setup',
  subheadline: COMMON_SUBHEADLINE,
  description:
    'We could not confirm one or more important components. Check your specifications manually so you do not spend money on creator gear before fixing a hidden PC bottleneck.',
  warningText: 'Verify the unresolved component before choosing performance upgrades.',
  ...COMMON_CTA,
};

export const CREATOR_SCENARIO_DEFAULTS = {
  PASS_RECOMMENDED: {
    headline: 'Your PC Is Ready to Become a Creator Setup',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'Your system is already in a strong position for gaming and content creation. The next upgrades should improve how you sound, look, record, and manage your stream.',
    warningText: '',
    ...COMMON_CTA,
  },
  PASS_MINIMUM: {
    headline: 'Your PC Can Play — But Streaming Will Push It Harder',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'Running GTA VI and streaming at the same time adds extra load from OBS, browser sources, recording, chat, and background apps. Prioritize performance headroom before spending heavily on accessories.',
    warningText: 'Start with performance headroom, then add audio and camera gear.',
    ...COMMON_CTA,
  },
  FAIL_GPU: {
    headline: 'Fix the GPU Bottleneck Before You Start Streaming',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'Your current GPU is already below the estimated gaming target. Streaming and recording will add even more demand. Upgrade the GPU first, then build out the rest of your creator setup.',
    warningText: 'Prioritize a modern GPU with hardware encoding support.',
    ...COMMON_CTA,
  },
  FAIL_CPU: {
    headline: 'Your CPU Is the First Upgrade for a Smoother Stream',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'Streaming software, gameplay, alerts, browser sources, and recording all compete for CPU resources. Improve processor headroom before adding more creator tools.',
    warningText: 'Solve the CPU bottleneck before spending heavily on accessories.',
    ...COMMON_CTA,
  },
  FAIL_RAM: {
    headline: 'More Memory Is Essential for Gaming and Streaming Together',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'OBS, GTA VI, browser tabs, chat, plugins, and editing software can use a large amount of memory. Move to 32 GB or 64 GB before building out the rest of the setup.',
    warningText: 'Upgrade memory first so creator apps have room to run together.',
    ...COMMON_CTA,
  },
  FAIL_STORAGE: {
    headline: 'You Need More Fast Storage for Recordings and Editing',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'Gameplay recordings, clips, thumbnails, and editing files take up space quickly. A larger NVMe SSD is one of the most practical creator upgrades.',
    warningText: 'Make space for the game, recordings, and editing files before going live.',
    ...COMMON_CTA,
  },
  FAIL_CPU_GPU: {
    headline: 'Fix the Core Performance Bottlenecks Before You Stream',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'Your CPU and GPU both need attention. Improve those core components first so gameplay, OBS, recording, chat, and background apps have dependable performance headroom.',
    warningText: 'Start with the CPU and GPU before adding stream accessories.',
    ...COMMON_CTA,
  },
  FAIL_GPU_RAM: {
    headline: 'Upgrade Graphics and Memory Before Building Out Your Stream',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'Your GPU and memory are already limiting gaming performance. Solve both bottlenecks before adding the extra workload from OBS, recording, browser sources, and editing tools.',
    warningText: 'Prioritize a capable GPU and at least 32 GB of memory.',
    ...COMMON_CTA,
  },
  FAIL_CPU_RAM: {
    headline: 'Give Your Creator Apps More Processing and Memory Headroom',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'Streaming and editing put sustained pressure on both the processor and memory. Upgrade those foundations before investing heavily in cameras, microphones, or controls.',
    warningText: 'Fix the CPU and RAM bottlenecks first.',
    ...COMMON_CTA,
  },
  FAIL_MULTIPLE: {
    headline: 'Build the Foundation Before Buying Stream Accessories',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'Your PC has several performance bottlenecks. Start with the core system upgrades first, then add microphones, cameras, lighting, and controls once the machine can handle gaming and streaming reliably.',
    warningText: 'Build your setup one piece at a time, starting with the biggest bottleneck.',
    ...COMMON_CTA,
  },
  UNKNOWN_GPU: { ...UNKNOWN_COPY },
  UNKNOWN_CPU: { ...UNKNOWN_COPY },
  UNKNOWN_RAM: { ...UNKNOWN_COPY },
  UNKNOWN_STORAGE: {
    ...UNKNOWN_COPY,
    headline: 'Verify Your Storage Before Recording Gameplay',
    description:
      'We could not confirm your storage. Check its capacity and type before recording or editing, because GTA VI footage and project files can use space quickly.',
    warningText: 'Confirm available capacity and whether the drive is an SSD or HDD.',
  },
  CANNOT_DETERMINE: {
    headline: 'Start With the Creator Setup Checklist',
    subheadline: COMMON_SUBHEADLINE,
    description:
      'We could not fully evaluate your system. Verify your PC components first, then follow the creator setup guide in order of importance.',
    warningText: 'Confirm your CPU, GPU, and RAM before buying performance upgrades.',
    ...COMMON_CTA,
  },
} satisfies Record<CoreRecommendationScenarioCode, CreatorCopy>;

export const CREATOR_TEMPLATES: CreatorTemplate[] = [
  {
    id: 'stream-starter',
    name: 'Stream Starter Setup',
    description: 'A practical first setup for audio, camera, lighting, and stream control.',
    copy: {
      headline: 'Ready to Build Your First GTA VI Stream Setup?',
      subheadline: COMMON_SUBHEADLINE,
      description:
        'Start with the creator tools that improve how you sound, look, and manage a live stream. Add each part as your workflow grows.',
      primaryCtaLabel: 'Build My Streaming Setup',
    },
    groups: [
      { title: 'Audio That Viewers Notice', description: 'Start with clear, dependable voice audio.' },
      { title: 'Look Better on Camera', description: 'Improve camera framing and lighting without overbuilding.' },
      { title: 'Control the Stream Faster', description: 'Keep common scene and audio controls close at hand.' },
    ],
  },
  {
    id: 'budget-creator',
    name: 'Budget Creator Setup',
    description: 'Prioritizes high-impact creator upgrades at approachable price points.',
    copy: {
      headline: 'Build a Capable Creator Setup Without Buying Everything at Once',
      subheadline: 'Start with the upgrades that solve the biggest problem.',
      description:
        'Focus on dependable essentials first, then improve audio, video, storage, and workflow one piece at a time.',
      primaryCtaLabel: 'See Budget Creator Picks',
    },
    groups: [
      { title: 'Creator Essentials', description: 'High-impact basics for a new channel.' },
      { title: 'Storage for Recordings and Editing', description: 'Affordable capacity for clips and projects.' },
    ],
  },
  {
    id: 'performance-streaming',
    name: 'Performance Streaming Setup',
    description: 'Leads with PC headroom for gameplay, OBS, recording, and multitasking.',
    copy: {
      headline: 'Create More Performance Headroom for Gaming and Streaming',
      subheadline: 'Your gaming PC may run GTA VI, but streaming adds extra workload.',
      description:
        'Prioritize the CPU, GPU, memory, and fast storage that keep gameplay and creator tools running together.',
      primaryCtaLabel: 'Build My Performance Setup',
    },
    groups: [
      { title: 'Stream Performance Upgrades', description: 'Core upgrades for OBS, recording, and multitasking.' },
      { title: 'Storage for Recordings and Editing', description: 'Fast capacity for footage and project files.' },
      { title: 'See Your Game, Chat, and OBS at Once', description: 'Add workspace visibility with a second display.' },
    ],
  },
  {
    id: 'advanced-creator',
    name: 'Advanced Creator Setup',
    description: 'A broader multi-device setup for established creator workflows.',
    copy: {
      headline: 'Build a More Complete GTA VI Creator Workspace',
      subheadline: 'Upgrade the workflow around the PC, not just the PC itself.',
      description:
        'Improve capture, audio, camera, lighting, storage, controls, and workspace visibility for a more flexible production setup.',
      primaryCtaLabel: 'See Advanced Creator Gear',
    },
    groups: [
      { title: 'Audio That Viewers Notice', description: 'Higher-quality audio and monitoring.' },
      { title: 'Camera and Lighting', description: 'A more controlled on-camera presentation.' },
      { title: 'Capture Cards and Stream Controllers', description: 'Tools for multi-device capture and faster control.' },
      { title: 'Creator Workspace', description: 'Displays and accessories for a larger workflow.' },
    ],
  },
  {
    id: 'creator-essentials',
    name: 'Creator Essentials',
    description: 'A focused list of the creator tools that make the biggest practical difference.',
    copy: {
      headline: 'Start With the Creator Tools That Matter Most',
      subheadline: 'Build your setup one piece at a time.',
      description:
        'Choose the upgrades that improve performance, audio, recording, and stream management before adding optional accessories.',
      primaryCtaLabel: 'See Creator Essentials',
    },
    groups: [
      { title: 'Stream Performance Upgrades', description: 'Solve the largest PC bottleneck first.' },
      { title: 'Audio That Viewers Notice', description: 'Make voice audio clear and consistent.' },
      { title: 'Storage for Recordings and Editing', description: 'Keep room for clips and project files.' },
    ],
  },
];
