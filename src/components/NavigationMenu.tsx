export type NavigationPage = "blocks" | "schedule" | "settings";

const NAV_ITEMS: { id: NavigationPage; label: string }[] = [
  { id: "blocks", label: "Blocks" },
  { id: "schedule", label: "Schedule" },
  { id: "settings", label: "Settings" },
];

interface NavigationMenuProps {
  currentPage: NavigationPage;
  onPageChange: (page: NavigationPage) => void;
}

export function NavigationMenu({
  currentPage,
  onPageChange,
}: NavigationMenuProps) {
  return (
    <nav
      className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col items-start gap-0 px-6 pt-6 sm:w-96 sm:px-10 sm:pt-8"
      aria-label="Primary"
    >
      {NAV_ITEMS.map((item) => {
        const isSelected = currentPage === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPageChange(item.id)}
            aria-current={isSelected ? "page" : undefined}
            className={`group relative flex h-16 w-full cursor-pointer items-center pl-5 text-left font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-20 sm:pl-7 ${
              isSelected
                ? "text-4xl text-white sm:text-6xl"
                : "text-xl text-neutral-500 hover:text-neutral-300 sm:text-3xl"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-10 w-1 -translate-y-1/2 rounded-full bg-white transition-opacity duration-200 sm:h-14 ${
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-40"
              }`}
              aria-hidden="true"
            />
            <span className="leading-none">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
