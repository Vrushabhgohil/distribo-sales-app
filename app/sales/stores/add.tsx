import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/CustomAlert';
import { Input } from '@/components/ui/Input';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthContext';
import { dataService } from '@/services/data-service';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CreditCard,
  MapPin,
  Phone,
  Store as StoreIcon,
  User,
} from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as z from 'zod';

const storeSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  owner_name: z.string().min(2, 'Owner name is required'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit mobile number starting with 6-9 required'),
  alternate_mobile: z.string().optional(),
  email: z.string().optional(),
  address: z.string().min(3, 'Full street address is required'),
  area: z.string().min(2, 'Territory/Area is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Valid 6-digit PIN code required'),
  store_type: z.string().min(1, 'Store type is required'),
  gst_number: z.string().optional(),
});

type StoreFormData = z.infer<typeof storeSchema>;

const STORE_TYPES = [
  'Kirana / Grocery',
  'General Store',
  'Supermarket',
  'Provision Store',
  'Retail Outlet',
  'Bakery / Snacks',
];

export default function AddStoreScreen() {
  const router = useRouter();
  const { salesperson } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      owner_name: '',
      mobile: '',
      alternate_mobile: '',
      email: '',
      address: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      store_type: 'Kirana / Grocery',
      gst_number: '',
    },
  });

  const selectedStoreType = watch('store_type');

  const onSubmit = async (data: StoreFormData) => {
    setSubmitting(true);
    const result = await dataService.createStore({
      name: data.name.trim(),
      owner_name: data.owner_name.trim(),
      mobile: data.mobile.trim(),
      alternate_mobile: data.alternate_mobile?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address.trim(),
      area: data.area.trim(),
      city: `${data.city.trim()}, ${data.state.trim()}`,
      pincode: data.pincode.trim(),
      store_type: data.store_type,
      gst_number: data.gst_number?.trim() || null,
      credit_limit: 0,
      payment_terms: 'Net 30',
      gps_lat: null,
      gps_lng: null,
      assigned_salesperson_id: salesperson?.id || null,
      status: 'active',
    });

    setSubmitting(false);

    if (result.success && result.data) {
      Alert.alert('Store Registered', `${data.name} has been enrolled in your beat route.`, [
        {
          text: 'Open Store Details',
          onPress: () => router.replace(`/sales/stores/${result.data!.id}` as any),
        },
        {
          text: 'View Stores',
          style: 'cancel',
          onPress: () => router.replace('/sales/(tabs)/stores'),
        },
      ]);
    } else if (result.success) {
      Alert.alert('Store Registered', `${data.name} has been enrolled in your beat route.`, [
        { text: 'View Beat Stores', onPress: () => router.replace('/sales/(tabs)/stores') },
      ]);
    } else {
      Alert.alert('Registration Failed', result.error || 'Could not register store outlet.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Register New Store"
        subtitle="Add retail outlet to your beat route"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Store & Owner Identity */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Store & Owner Identity</Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Retail Store / Shop Name *"
                  placeholder="e.g. Radhe Krishna Provision Store"
                  value={value}
                  onChangeText={onChange}
                  error={errors.name?.message}
                  leftIcon={<StoreIcon size={18} color={Colors.textTertiary} />}
                />
              )}
            />

            <Controller
              control={control}
              name="owner_name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Owner / Proprietor Name *"
                  placeholder="e.g. Hasmukhbhai Patel"
                  value={value}
                  onChangeText={onChange}
                  error={errors.owner_name?.message}
                  leftIcon={<User size={18} color={Colors.textTertiary} />}
                />
              )}
            />

            <Controller
              control={control}
              name="mobile"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Primary Mobile Number *"
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  value={value}
                  onChangeText={onChange}
                  error={errors.mobile?.message}
                  leftIcon={<Phone size={18} color={Colors.textTertiary} />}
                />
              )}
            />

            <Controller
              control={control}
              name="alternate_mobile"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Alternate Mobile (Optional)"
                  placeholder="e.g. 9876543211"
                  keyboardType="phone-pad"
                  value={value}
                  onChangeText={onChange}
                  leftIcon={<Phone size={18} color={Colors.textTertiary} />}
                />
              )}
            />

            {/* Store Type Chips Selector */}
            <Text style={styles.inputLabel}>Outlet Category Type</Text>
            <View style={styles.typeChipsRow}>
              {STORE_TYPES.map((type) => {
                const isSel = selectedStoreType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setValue('store_type', type)}
                    style={[styles.typeChip, isSel && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeChipText, isSel && styles.typeChipTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 2: Address & Location */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Store Address & Location</Text>

            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Full Shop Address *"
                  placeholder="Shop #, Building, Street name..."
                  value={value}
                  onChangeText={onChange}
                  error={errors.address?.message}
                  multiline
                  numberOfLines={2}
                  leftIcon={<MapPin size={18} color={Colors.textTertiary} />}
                />
              )}
            />

            <View style={styles.twoColRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Controller
                  control={control}
                  name="area"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Beat Area *"
                      placeholder="e.g. Navrangpura"
                      value={value}
                      onChangeText={onChange}
                      error={errors.area?.message}
                    />
                  )}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Controller
                  control={control}
                  name="city"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="City *"
                      placeholder="e.g. Ahmedabad"
                      value={value}
                      onChangeText={onChange}
                      error={errors.city?.message}
                    />
                  )}
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Controller
                  control={control}
                  name="state"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="State *"
                      placeholder="e.g. Gujarat"
                      value={value}
                      onChangeText={onChange}
                      error={errors.state?.message}
                    />
                  )}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Controller
                  control={control}
                  name="pincode"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="PIN Code *"
                      placeholder="e.g. 380009"
                      keyboardType="number-pad"
                      value={value}
                      onChangeText={onChange}
                      error={errors.pincode?.message}
                    />
                  )}
                />
              </View>
            </View>
          </View>

          {/* Section 3: Business Information */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Business Information</Text>

            <Controller
              control={control}
              name="gst_number"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="GSTIN (Optional)"
                  placeholder="e.g. 24ABCDE1234F1Z5"
                  autoCapitalize="characters"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Business Email (Optional)"
                  placeholder="e.g. store@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />

            <View style={styles.adminNoteBox}>
              <CreditCard size={16} color={Colors.textSecondary} />
              <Text style={styles.adminNoteText}>
                Credit limits and payment terms are configured and approved centrally by Admin.
              </Text>
            </View>
          </View>

          <Button
            title="Register Store Outlet"
            variant="primary"
            size="xl"
            loading={submitting}
            onPress={() => handleSubmit(onSubmit)()}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
    ...Shadows.xs,
  },
  sectionHeading: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  inputLabel: {
    ...Typography.labelMd,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  // GPS Geofence Box
  gpsCaptureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 12,
    marginTop: 8,
  },
  gpsBoxTitle: {
    ...Typography.labelSm,
    color: Colors.textPrimary,
  },
  gpsBoxCoord: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  gpsPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  gpsPinText: {
    ...Typography.buttonSm,
    color: Colors.primary,
  },
  submitBtn: {
    marginTop: 4,
    marginBottom: 20,
  },
  adminNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: Radius.lg,
    marginTop: 4,
  },
  adminNoteText: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});
