"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export interface CategoryExplorerOption {
  href: string;
  id: string;
  imageUrl: string | null;
  name: string;
}

export interface CategoryExplorerGroup {
  href: string;
  id: string;
  imageUrl: string | null;
  name: string;
  options: CategoryExplorerOption[];
}

interface CategoryExplorerProps {
  groups: CategoryExplorerGroup[];
}

function CategoryArtwork({
  imageUrl,
  name,
}: Pick<CategoryExplorerOption, "imageUrl" | "name">): React.ReactElement {
  if (imageUrl) {
    return <img alt="" src={imageUrl} />;
  }

  return <span aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>;
}

export function CategoryExplorer({
  groups,
}: CategoryExplorerProps): React.ReactElement | null {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const activeGroup =
    groups.find((group) => group.id === activeGroupId) ?? null;

  useEffect(() => {
    if (!activeGroup) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setActiveGroupId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [activeGroup]);

  if (groups.length === 0) {
    return null;
  }

  function closeExplorer(): void {
    setActiveGroupId(null);
  }

  return (
    <section className="category-explorer" id="categories">
      <header className="category-explorer-heading">
        <p>At-home salon menu</p>
        <h2>Explore our categories</h2>
        <span>Choose a category to see treatments and services.</span>
      </header>

      <div className="category-explorer-groups">
        {groups.map((group) =>
          group.options.length > 0 ? (
            <button
              aria-haspopup="dialog"
              className="category-explorer-group"
              key={group.id}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setActiveGroupId(group.id);
              }}
              type="button"
            >
              <span className="category-explorer-group-media">
                <CategoryArtwork imageUrl={group.imageUrl} name={group.name} />
              </span>
              <strong>{group.name}</strong>
            </button>
          ) : (
            <a
              className="category-explorer-group"
              href={group.href}
              key={group.id}
            >
              <span className="category-explorer-group-media">
                <CategoryArtwork imageUrl={group.imageUrl} name={group.name} />
              </span>
              <strong>{group.name}</strong>
            </a>
          ),
        )}
      </div>

      {activeGroup ? (
        <div className="category-explorer-overlay">
          <button
            aria-label="Close category menu"
            className="category-explorer-backdrop"
            onClick={closeExplorer}
            type="button"
          />
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="category-explorer-dialog"
            role="dialog"
          >
            <header>
              <div>
                <p>Choose a service</p>
                <h2 id={titleId}>{activeGroup.name}</h2>
              </div>
              <button
                aria-label="Close category menu"
                className="category-explorer-close"
                onClick={closeExplorer}
                ref={closeButtonRef}
                type="button"
              >
                <X size={22} />
              </button>
            </header>

            <nav
              aria-label={`${activeGroup.name} categories`}
              className="category-explorer-options"
            >
              {activeGroup.options.map((option) => (
                <a href={option.href} key={option.id}>
                  <span>
                    <CategoryArtwork
                      imageUrl={option.imageUrl}
                      name={option.name}
                    />
                  </span>
                  <strong>{option.name}</strong>
                </a>
              ))}
            </nav>

            <a className="category-explorer-view-all" href={activeGroup.href}>
              View all {activeGroup.name}
              <ArrowRight size={17} />
            </a>
          </section>
        </div>
      ) : null}
    </section>
  );
}
