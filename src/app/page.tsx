"use client";

import React, { useState } from "react";
import { useAppWasherStore } from "@/lib/store";
import { Header } from "@/components/Header";
import { CustomerView } from "@/components/CustomerView";
import { StationHeadView } from "@/components/StationHeadView";
import { WasherView } from "@/components/WasherView";
import { LoginPage } from "@/components/LoginPage";
import { DEFAULT_WASHER, DEFAULT_STATION_HEAD } from "@/lib/defaultData";
import { Sparkles, Building2, ShieldCheck, Car } from "lucide-react";

export default function Home() {
  const {
    user,
    isLoaded,
    role,
    bookings,
    stationCrew,
    setRole,
    setUser,
    registerUser,
    authenticateUser,
    logout,
    loginDemo,
    addCarToGarage,
    removeCarFromGarage,
    removeAllCarsFromGarage,
    addAddressToUser,
    removeAddressFromUser,
    removeAllAddressesFromUser,
    createBooking,
    assignBookingToWorker,
    addBeforePhotos,
    completeJob,
    markPaymentPaid,
    settlePlatformShareOnline,
    submitReview,
  } = useAppWasherStore();

  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Ensure role is strictly locked to authenticated user's role
  React.useEffect(() => {
    if (user && role !== user.role) {
      setRole(user.role);
    }
  }, [user, role, setRole]);

  // Role switch is strictly restricted: authenticated users are locked to their assigned role!
  const handleRoleSwitch = (newRole: "customer" | "station_head" | "washer") => {
    if (user) {
      // User is authenticated. Their role is locked to prevent cross-portal access!
      return;
    }
    setRole(newRole);
  };

  // If initial local storage sync is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F7F8F7] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#707875] text-sm font-semibold">
          <Sparkles className="w-5 h-5 text-[#07865B] animate-spin" />
          <span>Loading App Washer...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in, show initial login screen first!
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F8F7] text-[#171A19]">
        <Header
          role={role}
          onRoleChange={handleRoleSwitch}
          isLoggedIn={false}
          onOpenAuth={() => setAuthModalOpen(true)}
          onLogout={logout}
        />
        <main className="flex-1">
          <LoginPage
            onLogin={(u, r) => {
              setUser(u);
              if (r) setRole(r);
            }}
            onDemoLogin={loginDemo}
            onRegisterUser={registerUser}
            onAuthenticate={authenticateUser}
            onStationHeadLogin={() => {
              setRole("station_head");
              setUser({ ...DEFAULT_STATION_HEAD, isLoggedIn: true });
            }}
            onWasherLogin={() => {
              setRole("washer");
              setUser({
                id: DEFAULT_WASHER.id,
                name: DEFAULT_WASHER.name,
                username: DEFAULT_WASHER.username,
                password: DEFAULT_WASHER.password,
                phone: DEFAULT_WASHER.phone,
                email: "rajesh.washer@appwasher.com",
                role: "washer",
                garage: [],
                addresses: [],
                isLoggedIn: true,
              });
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8F7] text-[#171A19]">
      {/* Global Header */}
      <Header
        role={role}
        onRoleChange={handleRoleSwitch}
        userName={user?.name || "Partner"}
        userPhone={user?.phone || "+91 91234 56789"}
        isLoggedIn={!!user}
        userRole={user?.role}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={logout}
      />

      {/* Switch Account Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#171A19]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-[#E7EBE8] relative">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#F7F8F7] hover:bg-[#E7EBE8] text-[#171A19] flex items-center justify-center font-bold text-sm transition-colors"
            >
              ✕
            </button>
            <LoginPage
              onLogin={(u, r) => {
                setUser(u);
                if (r) setRole(r);
                setAuthModalOpen(false);
              }}
              onDemoLogin={(r) => {
                loginDemo(r);
                setAuthModalOpen(false);
              }}
              onRegisterUser={registerUser}
              onAuthenticate={authenticateUser}
              onStationHeadLogin={() => {
                setRole("station_head");
                setUser({ ...DEFAULT_STATION_HEAD, isLoggedIn: true });
                setAuthModalOpen(false);
              }}
              onWasherLogin={() => {
                setRole("washer");
                setUser({
                  id: DEFAULT_WASHER.id,
                  name: DEFAULT_WASHER.name,
                  username: DEFAULT_WASHER.username,
                  password: DEFAULT_WASHER.password,
                  phone: DEFAULT_WASHER.phone,
                  email: "rajesh.washer@appwasher.com",
                  role: "washer",
                  garage: [],
                  addresses: [],
                  isLoggedIn: true,
                });
                setAuthModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Role-Specific Portal Info Banner */}
      <div
        className={`border-b px-4 py-2.5 text-xs ${
          role === "customer"
            ? "bg-[#E8F7EF] border-[#07865B]/20 text-[#066747]"
            : role === "station_head"
            ? "bg-[#F2FAF6] border-[#07865B]/25 text-[#055239]"
            : "bg-[#F7F8F7] border-[#E7EBE8] text-[#171A19]"
        }`}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {role === "customer" ? (
              <>
                <Car className="w-4 h-4 text-[#07865B] shrink-0" />
                <span>
                  <strong>Customer Portal:</strong> Book doorstep washes, manage vehicles & parking spots, and verify before/after insurance photos.
                </span>
              </>
            ) : role === "station_head" ? (
              <>
                <Building2 className="w-4 h-4 text-[#07865B] shrink-0" />
                <span>
                  <strong>Station Head Dispatch:</strong> Area customer bookings are routed here. Assign crew technicians and settle 20% platform share.
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#07865B] shrink-0" />
                <span>
                  <strong>Technician Field Portal:</strong> Capture mandatory Before-Photos, wash car, upload After-Photos, and collect Cash/UPI.
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] bg-white px-2.5 py-0.5 rounded-full border border-[#E7EBE8] font-semibold flex items-center gap-1 shadow-2xs">
              {role === "customer" && <Car className="w-3 h-3 text-[#07865B]" />}
              {role === "station_head" && <Building2 className="w-3 h-3 text-[#07865B]" />}
              {role === "washer" && <ShieldCheck className="w-3 h-3 text-[#07865B]" />}
              <span className="capitalize">{role.replace("_", " ")} Session ({user?.name || "User"})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {role === "customer" && user ? (
          <CustomerView
            user={user}
            bookings={bookings}
            onAddCar={addCarToGarage}
            onRemoveCar={removeCarFromGarage}
            onRemoveAllCars={removeAllCarsFromGarage}
            onAddAddress={addAddressToUser}
            onRemoveAddress={removeAddressFromUser}
            onRemoveAllAddresses={removeAllAddressesFromUser}
            onCreateBooking={createBooking}
            onPaymentSuccess={(id, ref) => markPaymentPaid(id, "UPI", ref)}
            onSubmitReview={submitReview}
          />
        ) : role === "station_head" ? (
          <StationHeadView
            bookings={bookings}
            stationCrew={stationCrew}
            onAssignWorker={assignBookingToWorker}
            onSettleOnline={settlePlatformShareOnline}
          />
        ) : (
          <WasherView
            bookings={bookings}
            onSaveBeforePhotos={addBeforePhotos}
            onCompleteJob={completeJob}
            onCollectPayment={markPaymentPaid}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E7EBE8] bg-white py-6 text-center text-xs text-[#707875]">
        <div className="max-w-4xl mx-auto px-4 space-y-1.5">
          <p className="font-semibold text-[#171A19]">
            App Washer • Doorstep Car Care Network
          </p>
          <p className="text-[11px] text-[#707875]">
            Station Head Dispatch • Technician On-Site Inspection • Cash Collection & Online Platform Settlement
          </p>
        </div>
      </footer>
    </div>
  );
}
