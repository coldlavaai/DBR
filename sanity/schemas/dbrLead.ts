import { defineType } from 'sanity'

export const dbrLead = defineType({
  name: 'dbrLead',
  title: 'DBR Lead (Database Recovery)',
  type: 'document',
  fields: [
    // Contact Status (Primary field)
    {
      name: 'contactStatus',
      title: 'Contact Status',
      type: 'string',
      description: 'Current status of the lead in the DBR workflow',
      options: {
        list: [
          { title: '🔥 HOT - Ready to Convert', value: 'HOT' },
          { title: '🟠 WARM - Showing Interest', value: 'WARM' },
          { title: '🔵 NEUTRAL - Undecided', value: 'NEUTRAL' },
          { title: '🧊 COLD - Low Interest', value: 'COLD' },
          { title: '✅ POSITIVE - Interested', value: 'POSITIVE' },
          { title: '✔️ Ready', value: 'Ready' },
          { title: '📞 CALL_BOOKED - Call Scheduled', value: 'CALL_BOOKED' },
          { title: '📤 Sent_1 - First Message Sent', value: 'Sent_1' },
          { title: '📤 Sent_2 - Second Message Sent', value: 'Sent_2' },
          { title: '📤 Sent_3 - Third Message Sent', value: 'Sent_3' },
          { title: '❌ NEGATIVE - Not Interested', value: 'NEGATIVE' },
          { title: '🚫 REMOVED - Opted Out', value: 'REMOVED' },
          { title: '⏸️ PAUSED - On Hold', value: 'PAUSED' },
          { title: '📅 SCHEDULED - Install Booked', value: 'SCHEDULED' },
          { title: '✅ INSTALLED - Completed', value: 'INSTALLED' },
          { title: '✨ CONVERTED - Deal Won', value: 'CONVERTED' },
        ],
        layout: 'dropdown',
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'Sent_1',
    },

    // Lead Information
    {
      name: 'firstName',
      title: 'First Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'secondName',
      title: 'Last Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'phoneNumber',
      title: 'Phone Number',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'emailAddress',
      title: 'Email Address',
      type: 'string',
      validation: (Rule) => Rule.email(),
    },
    {
      name: 'postcode',
      title: 'Postcode',
      type: 'string',
    },
    {
      name: 'address',
      title: 'Full Address',
      type: 'text',
      rows: 2,
    },

    // Timing & Tracking
    {
      name: 'enquiryDate',
      title: 'Original Enquiry Date',
      type: 'string',
      description: 'When they first inquired about solar panels',
    },
    {
      name: 'rowNumber',
      title: 'Sheet Row Number',
      type: 'number',
      description: 'Original row number from Google Sheet',
      readOnly: true,
    },

    // Message Tracking
    {
      name: 'm1Sent',
      title: 'Message 1 Sent At',
      type: 'datetime',
      description: 'Timestamp of first follow-up message',
    },
    {
      name: 'm2Sent',
      title: 'Message 2 Sent At',
      type: 'datetime',
      description: 'Timestamp of second follow-up message (24h later)',
    },
    {
      name: 'm3Sent',
      title: 'Message 3 Sent At',
      type: 'datetime',
      description: 'Timestamp of third follow-up message (48h later)',
    },

    // Reply & Conversation Tracking
    {
      name: 'replyReceived',
      title: 'Last Reply Received At',
      type: 'datetime',
      description: 'When the lead last responded',
    },
    {
      name: 'latestLeadReply',
      title: 'Latest Reply from Lead',
      type: 'text',
      description: 'Most recent message from the lead',
      rows: 3,
    },
    {
      name: 'conversationHistory',
      title: 'Full Conversation History',
      type: 'text',
      description: 'Complete SMS conversation thread',
      rows: 8,
    },

    // AI Processing
    {
      name: 'replyProcessed',
      title: 'Reply Processed',
      type: 'string',
      description: 'Whether the lead reply has been processed by AI',
      options: {
        list: [
          { title: '✅ YES', value: 'YES' },
          { title: '⏳ PENDING', value: 'PENDING' },
          { title: '❌ NO', value: 'NO' },
        ],
      },
      initialValue: 'NO',
    },
    {
      name: 'leadSentiment',
      title: 'Lead Sentiment (AI Analysis)',
      type: 'string',
      description: 'AI-detected sentiment from lead responses',
      options: {
        list: [
          { title: '🔥 POSITIVE - Interested', value: 'POSITIVE' },
          { title: '❌ NEGATIVE - Not Interested', value: 'NEGATIVE' },
          { title: '🚫 NEGATIVE_REMOVED - Opted Out', value: 'NEGATIVE_REMOVED' },
          { title: '🤔 NEUTRAL - Undecided', value: 'NEUTRAL' },
          { title: '❓ UNCLEAR - Need More Info', value: 'UNCLEAR' },
        ],
        layout: 'dropdown',
      },
    },
    {
      name: 'aiReplySent',
      title: 'AI Reply Sent At',
      type: 'datetime',
      description: 'When AI sent a response to the lead',
    },

    // Outcome Tracking
    {
      name: 'installDate',
      title: 'Installation Date',
      type: 'date',
      description: 'Scheduled installation date if booked',
    },
    {
      name: 'callBookedTime',
      title: 'Call Booked Time',
      type: 'datetime',
      description: 'Date and time of booked call/appointment (from Cal.com or manual booking)',
    },
    {
      name: 'finalStatus',
      title: 'Final Outcome',
      type: 'string',
      description: 'Final result of the DBR campaign',
      options: {
        list: [
          { title: '✅ Won - Converted to Sale', value: 'WON' },
          { title: '❌ Lost - Not Interested', value: 'LOST' },
          { title: '🚫 Removed - Opted Out', value: 'REMOVED' },
          { title: '⏸️ Paused - Future Follow-up', value: 'PAUSED' },
          { title: '⏳ In Progress', value: 'IN_PROGRESS' },
        ],
        layout: 'radio',
      },
    },

    // Notes & Manual Override
    {
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      description: 'Private notes about this lead',
      rows: 3,
    },

    // Cal.com Booking Integration
    {
      name: 'calBookingId',
      title: 'Cal.com Booking ID',
      type: 'string',
      description: 'Cal.com booking reference ID',
      readOnly: true,
    },
    {
      name: 'calBookingUrl',
      title: 'Cal.com Booking URL',
      type: 'url',
      description: 'Direct link to the Cal.com booking',
      readOnly: true,
    },
    {
      name: 'lastUpdatedAt',
      title: 'Last Updated At',
      type: 'datetime',
      description: 'When this lead was last modified in the dashboard',
      readOnly: true,
    },

    // Archive Status
    {
      name: 'archived',
      title: 'Archived',
      type: 'boolean',
      description: 'Archived hot leads that have been acknowledged',
      initialValue: false,
    },
    {
      name: 'archivedAt',
      title: 'Archived At',
      type: 'datetime',
      description: 'When this lead was archived',
      readOnly: true,
    },

    // Manual Mode Control
    {
      name: 'manualMode',
      title: 'Manual Communication Mode',
      type: 'boolean',
      description: 'When enabled, AI automation is paused and manual SMS control is activated',
      initialValue: false,
    },
    {
      name: 'manualModeActivatedAt',
      title: 'Manual Mode Activated At',
      type: 'datetime',
      description: 'When manual mode was last activated',
      readOnly: true,
    },

    // Sync Metadata
    {
      name: 'lastSyncedAt',
      title: 'Last Synced From Google Sheets',
      type: 'datetime',
      description: 'When this record was last updated from Google Sheets',
      readOnly: true,
    },
    {
      name: 'googleSheetId',
      title: 'Google Sheet ID',
      type: 'string',
      description: 'Reference to Google Sheet row',
      hidden: true,
      readOnly: true,
    },
  ],

  preview: {
    select: {
      firstName: 'firstName',
      secondName: 'secondName',
      phoneNumber: 'phoneNumber',
      contactStatus: 'contactStatus',
      leadSentiment: 'leadSentiment',
      replyReceived: 'replyReceived',
      enquiryDate: 'enquiryDate',
    },
    prepare({ firstName, secondName, phoneNumber, contactStatus, leadSentiment, replyReceived, enquiryDate }: {
      firstName: string;
      secondName: string;
      phoneNumber: string;
      contactStatus: string;
      leadSentiment: string;
      replyReceived: string;
      enquiryDate: string;
    }) {
      // Status emoji mapping
      const statusEmoji = {
        'HOT': '🔥',
        'WARM': '🟠',
        'NEUTRAL': '🔵',
        'COLD': '🧊',
        'POSITIVE': '✅',
        'Ready': '✔️',
        'CALL_BOOKED': '📞',
        'NEGATIVE': '❌',
        'REMOVED': '🚫',
        'Sent_1': '📤',
        'Sent_2': '📤',
        'Sent_3': '📤',
        'PAUSED': '⏸️',
        'SCHEDULED': '📅',
        'INSTALLED': '✅',
        'CONVERTED': '✨',
      }[contactStatus || 'Sent_1']

      const sentimentEmoji = {
        'POSITIVE': '🔥',
        'NEGATIVE': '❌',
        'NEGATIVE_REMOVED': '🚫',
        'NEUTRAL': '🤔',
        'UNCLEAR': '❓',
      }[leadSentiment || '']

      const fullName = `${firstName} ${secondName}`
      const lastReply = replyReceived ? new Date(replyReceived).toLocaleDateString() : 'No reply'

      return {
        title: `${statusEmoji} ${fullName} ${sentimentEmoji ? sentimentEmoji : ''}`,
        subtitle: `${phoneNumber} • ${enquiryDate || 'Unknown date'} • Last reply: ${lastReply}`,
      }
    },
  },

  orderings: [
    {
      title: 'Hottest First (Status Priority)',
      name: 'hottest',
      by: [
        { field: 'contactStatus', direction: 'asc' },
        { field: 'replyReceived', direction: 'desc' },
      ],
    },
    {
      title: 'Most Recent Reply',
      name: 'recentReply',
      by: [{ field: 'replyReceived', direction: 'desc' }],
    },
    {
      title: 'Message Sequence',
      name: 'messageSequence',
      by: [
        { field: 'm1Sent', direction: 'desc' },
        { field: 'm2Sent', direction: 'desc' },
        { field: 'm3Sent', direction: 'desc' },
      ],
    },
    {
      title: 'Original Enquiry Date',
      name: 'enquiryDate',
      by: [{ field: 'enquiryDate', direction: 'desc' }],
    },
  ],
})
