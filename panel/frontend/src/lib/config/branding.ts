export interface BrandLink {
  href: string;
  labelKey: string;
  titleKey: string;
}

export interface PanelBrand {
  name: string;
  shortMark: string;
  subtitleKey: string;
  links: BrandLink[];
}

export const panelBrand: PanelBrand = {
  name: 'ZODIAC PANEL',
  shortMark: 'Z',
  subtitleKey: 'serverPanel',
  links: []
};
