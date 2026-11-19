import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageSquare,
  Search,
  BookOpen,
  CheckCircle2,
  Store,
  ShoppingBag,
  Clock,
  Navigation,
  FileSpreadsheet,
  CalendarCheck,
  Send,
  X,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    id: 'login',
    question: 'How do I log in?',
    answer:
      'Enter your registered work email address and password provided by your company administrator, then tap "Sign In". If you forget your password, tap "Forgot Password?" to receive reset instructions.',
  },
  {
    id: 'find_store',
    question: 'How do I find a store?',
    answer:
      'Go to the "Stores" tab from the bottom navigation. Use the search bar at the top to search stores by name, area, or owner name. You can also filter stores by area or view your assigned beat route.',
  },
  {
    id: 'add_store',
    question: 'How do I add a new store?',
    answer:
      'Navigate to the "Stores" tab and tap the "+ New Store" button. Fill in store details including Store Name, Owner Name, Contact Mobile, Address, Area, and Store Type, then tap "Save Store Outlet".',
  },
  {
    id: 'store_visit',
    question: 'How do I start and complete a store visit?',
    answer:
      'Select a store from the Stores tab, then tap "Start Beat Visit". The app records your check-in time and GPS coordinates. When finished, tap "Complete Checkout", select your visit outcome (e.g. Order Booked, Payment Collected), add any notes, and tap Complete Checkout to finalize.',
  },
  {
    id: 'place_order',
    question: 'How do I place a new order?',
    answer:
      'Open the store from the Stores tab or during an active store visit, and tap "Book Order". Browse products from the catalogue, adjust quantities, review the order summary, and tap "Submit Order to Admin".',
  },
  {
    id: 'order_status',
    question: 'How do I check my order status?',
    answer:
      'Go to the "Orders" tab. Tap any order card to see its full breakdown, current status (Pending Approval, Approved, Out for Delivery, Delivered), items ordered, and delivery updates.',
  },
  {
    id: 'admin_approval',
    question: 'Why does my order require admin approval?',
    answer:
      'All wholesale sales orders require Central Admin approval to verify warehouse inventory availability and confirm store credit limits before goods are packed and dispatched.',
  },
  {
    id: 'payment_balance',
    question: 'How do I check my payment or outstanding balance?',
    answer:
      'Open the Store Details page and tap "View Store Ledger". Here you can review previous invoices, payments collected, running balances, and overdue amounts.',
  },
  {
    id: 'location_permission',
    question: 'Why does the application need location permission?',
    answer:
      'Location permission enables automatic GPS verification of store check-ins, beat route tracking, and territory coverage for your daily sales reporting.',
  },
  {
    id: 'app_troubleshoot',
    question: 'What should I do if my application is not working?',
    answer:
      'First check your internet connection. You can also visit Profile > Beat Settings & Cache Management and tap "Clear Cache" to reload fresh data. If problems persist, contact support via phone or email below.',
  },
];

const GUIDES = [
  {
    title: '1. Visiting a Store Outlet',
    icon: Store,
    steps: [
      'Navigate to "Stores" and select your target retail outlet.',
      'Tap "Start Beat Visit" when you arrive at the store.',
      'Perform your sales pitch, shelf audit, or collect payment.',
      'Tap "Complete Checkout", choose the outcome, and save your visit.',
    ],
  },
  {
    title: '2. Booking a Sales Order',
    icon: ShoppingBag,
    steps: [
      'Open the store and tap "Book Order".',
      'Search or select catalogue products and set quantities.',
      'Review total amounts, pricing, and pack sizes in your cart.',
      'Tap "Submit Order to Admin" for central warehouse verification.',
    ],
  },
  {
    title: '3. Checking Order Details',
    icon: Clock,
    steps: [
      'Open the "Orders" tab from the bottom navigation bar.',
      'Use status filters (Pending Admin, Approved, Delivered) or search.',
      'Tap any order to see product line breakdown and dispatch notes.',
    ],
  },
  {
    title: '4. Managing Follow-ups',
    icon: CalendarCheck,
    steps: [
      'Open the "Tasks / Follow-ups" tab to see scheduled follow-ups.',
      'Mark completed tasks or schedule new visit follow-ups.',
    ],
  },
  {
    title: '5. Checking Store Ledger & Payments',
    icon: FileSpreadsheet,
    steps: [
      'Open the store from the Stores tab.',
      'Tap "View Store Ledger" to review running balance and credit terms.',
      'Check invoice history and recorded collections.',
    ],
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('login');
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitted, setIssueSubmitted] = useState(false);

  // Filtered FAQs based on search
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_LIST;
    const q = searchQuery.toLowerCase();
    return FAQ_LIST.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@aarvifmcg.com?subject=Motiba%20Sales%20Help%20Request');
  };

  const handleReportIssue = () => {
    if (!issueDescription.trim()) {
      Alert.alert('Details Required', 'Please enter a brief description of the issue.');
      return;
    }

    setIssueSubmitted(true);
    setTimeout(() => {
      setIssueSubmitted(false);
      setIssueModalVisible(false);
      setIssueDescription('');
      Alert.alert('Issue Submitted', 'Your report has been submitted to the support team. We will review it shortly.');
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Help & Support"
        subtitle="User Guides & Frequently Asked Questions"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.textTertiary} />
          <TextInput
            placeholder="Search FAQs and help guides..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Section A: FAQs */}
        <View style={styles.sectionHeaderRow}>
          <HelpCircle size={18} color={Colors.primaryDark} />
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        </View>

        <View style={styles.faqList}>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <View key={faq.id} style={styles.faqCard}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleFaq(faq.id)}
                    style={styles.faqHeader}
                  >
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    {isExpanded ? (
                      <ChevronUp size={18} color={Colors.primaryDark} />
                    ) : (
                      <ChevronDown size={18} color={Colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.faqBody}>
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyFaq}>
              <Text style={styles.emptyFaqText}>No questions match your search.</Text>
            </View>
          )}
        </View>

        {/* Section B: How to Use the Application */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <BookOpen size={18} color={Colors.primaryDark} />
          <Text style={styles.sectionTitle}>How to Use the Application</Text>
        </View>

        {GUIDES.map((guide, idx) => {
          const IconComp = guide.icon;
          return (
            <View key={idx} style={styles.guideCard}>
              <View style={styles.guideHeader}>
                <View style={styles.guideIconBox}>
                  <IconComp size={18} color={Colors.primaryDark} />
                </View>
                <Text style={styles.guideTitle}>{guide.title}</Text>
              </View>
              <View style={styles.stepsList}>
                {guide.steps.map((st, sIdx) => (
                  <View key={sIdx} style={styles.stepRow}>
                    <View style={styles.stepBullet}>
                      <Text style={styles.stepNumber}>{sIdx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{st}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Section C: Contact Support */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Phone size={18} color={Colors.primaryDark} />
          <Text style={styles.sectionTitle}>Contact Support</Text>
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactDesc}>
            Need immediate help with your beat or order approval? Contact our support team:
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCallSupport}
            style={styles.contactItem}
          >
            <View style={[styles.contactIconBox, { backgroundColor: Colors.secondaryLight }]}>
              <Phone size={18} color={Colors.secondary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.contactLabel}>Helpline Phone</Text>
              <Text style={styles.contactVal}>+91 98765 43210 (Support Desk)</Text>
            </View>
            <Text style={styles.contactActionText}>Call</Text>
          </TouchableOpacity>

          <View style={styles.contactDivider} />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleEmailSupport}
            style={styles.contactItem}
          >
            <View style={[styles.contactIconBox, { backgroundColor: Colors.goldLight }]}>
              <Mail size={18} color={Colors.goldDark} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.contactLabel}>Support Email</Text>
              <Text style={styles.contactVal}>support@aarvifmcg.com</Text>
            </View>
            <Text style={styles.contactActionText}>Email</Text>
          </TouchableOpacity>

          <View style={styles.contactDivider} />

          <Button
            title="Report an Issue"
            variant="outline"
            size="lg"
            icon={<MessageSquare size={16} color={Colors.primaryDark} />}
            onPress={() => setIssueModalVisible(true)}
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>

      {/* Report Issue Modal */}
      <Modal
        visible={issueModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report an Issue</Text>
              <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                <X size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Describe any difficulty you are facing with visits, orders, or sync.
            </Text>

            <TextInput
              placeholder="Explain the issue in detail..."
              placeholderTextColor={Colors.textTertiary}
              value={issueDescription}
              onChangeText={setIssueDescription}
              multiline
              numberOfLines={4}
              style={styles.modalInput}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setIssueModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Submit Report"
                variant="primary"
                size="md"
                loading={issueSubmitted}
                icon={<Send size={14} color={Colors.white} />}
                onPress={handleReportIssue}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    minHeight: 46,
    marginBottom: 16,
    ...Shadows.xs,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    marginLeft: 8,
    paddingVertical: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    fontSize: 17,
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  faqQuestion: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 10,
    fontWeight: '700',
  },
  faqBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight + '80',
  },
  faqAnswer: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
  emptyFaq: {
    padding: 20,
    alignItems: 'center',
  },
  emptyFaqText: {
    ...Typography.bodyMd,
    color: Colors.textTertiary,
  },
  guideCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    ...Shadows.xs,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guideIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  guideTitle: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  stepsList: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  stepNumber: {
    ...Typography.captionSm,
    color: Colors.primaryDark,
    fontWeight: '800',
    fontSize: 10,
  },
  stepText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  contactCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  contactDesc: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
  },
  contactVal: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: 1,
  },
  contactActionText: {
    ...Typography.buttonSm,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  contactDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  modalSub: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

