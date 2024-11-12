import { Location } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { AppConfigService, TokenService } from '@wf1/core-ui';
import {
  RouterLink,
  WfApplicationConfiguration,
  WfApplicationState,
} from '@wf1/wfcc-application-ui';
import { WfMenuItems } from '@wf1/wfcc-application-ui/application/components/wf-menu/wf-menu.component';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { DisclaimerDialogComponent } from './components/disclaimer-dialog/disclaimer-dialog.component';
import { ApplicationStateService } from './services/application-state.service';
import { UpdateService } from './services/update.service';
import { WFMapService } from './services/wf-map.service';
import {
  ResourcesRoutes,
  isMobileView,
  isMobileView as mobileView,
  snowPlowHelper,
} from './utils';
import {
  CapacitorService,
  LocationNotification,
} from '@app/services/capacitor-service';
import { CommonUtilityService } from '@app/services/common-utility.service';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { filter } from 'rxjs/operators';

export const ICON = {
  advisories: 'advisories',
  backIcon: 'back-icon',
  bookmark: 'bookmark',
  cloudSun: 'cloud-sun',
  contactUs: 'contact-us',
  dot: 'dot',
  exclamationCircle: 'exclamation-circle',
  externalLink: 'external-link',
  facebookSquare: 'fb-square',
  facebook: 'facebook',
  filterCancel: 'filter-cancel',
  fire: 'fire',
  incident: 'incident',
  mapSigns: 'map-signs',
  map: 'map',
  mapHover: 'map-hover',
  twitter: 'twitter',
  camping: 'camping',
  larger: 'larger',
  phone: 'phone',
  arrowForwardEnabled: 'arrow-forward-enabled',
  arrowForwardDisabled: 'arrow-forward-disabled',
  camera: 'camera',
  image: 'image',
  cameraGrey: 'camera-grey',
  imageGrey: 'image-grey',
  edit: 'edit',
  send: 'send',
  locationOff: 'location-off',
  dashboard: 'dashboard',
  more: 'more',
  report: 'report',
  saved: 'saved',
  arrow: 'arrow',
  cancel: 'cancel',
  areaRestriction: 'area-restriction',
  ban: 'ban',
  fireDangerVeryLow: 'fire-danger-very-low',
  fireDangerLow: 'fire-danger-low',
  fireDangerModerate: 'fire-danger-moderate',
  fireDangerHigh: 'fire-danger-high',
  fireDangerExtreme: 'fire-danger-extreme',
  roadEvent: 'road-event',
  closedRecreationSite: 'closed-recreation-site',
  regionalDistricts: 'regional-districts',
  brownSquare: 'brown-square',
  indianReserve: 'indian-reserve',
  backIconPanel: 'back-icon-panel',
  fireNote: 'fire-note',
  locationDisabled: 'location-disabled',
  locationEnabled: 'location-enabled',
  calendar: 'calendar',
  zoomIn: 'zoom-in',
  agency: 'agency',
  carbonGauge: 'carbon-gauge',
  carbonCalendar: 'carbon-calendar',
  arrowLeft: 'arrow-left',
  carbonLayer: 'carbon-layer',
  launchWhite: 'launch_white'
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy, OnInit, AfterViewInit {
  title = 'News';

  isLoggedIn = true;
  hasAccess = true;

  applicationConfig: WfApplicationConfiguration = {
    title: 'Wildfire News',
    device: this.applicationStateService.getDevice(),
    userName: '',
    version: {
      long: '',
      short: '',
    },
    environment: '',
  };

  applicationState: WfApplicationState = {
    menu: 'hidden',
  };

  appMenu: WfMenuItems;
  footerMenu: WfMenuItems;
  orientation;

  lastSuccessPollSub: Subscription;
  lastSyncDate;
  lastSyncValue = undefined;
  tokenSubscription: Subscription;
  activeMenuItem = '';

  public url;
  public snowPlowHelper = snowPlowHelper;
  public isMobileView = mobileView;

  constructor(
    protected appConfigService: AppConfigService,
    protected router: Router,
    protected location: Location,
    protected updateService: UpdateService,
    protected applicationStateService: ApplicationStateService,
    protected matIconRegistry: MatIconRegistry,
    protected domSanitizer: DomSanitizer,
    protected tokenService: TokenService,
    protected cdr: ChangeDetectorRef,
    protected dialog: MatDialog,
    protected wfMapService: WFMapService,
    protected capacitorService: CapacitorService,
    protected commonUtilityService: CommonUtilityService,
    protected zone: NgZone,
    protected titleService: Title,
    protected metaService: Meta,
  ) {
  }

  @HostListener('window:orientationchange', ['$event'])
  onOrientationChange() {
    this.onSizeChange();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.onSizeChange();
  }

  ngOnInit() {
    if (this.isMobileView()) {
      this.initializeDeepLinks();
      if (typeof (window.screen.orientation as any).lock === 'function') {
        const lock = (window.screen.orientation as any).lock('portrait');
        (lock as Promise<any>)
          .then(() => {
            console.log('Orientation locked to Portrait');
          })
          .catch((err) => {
            console.error('Failed to lock device orientation: ', err);
          });
      } else {
        console.error('Failed to lock device orientation');
      }
    }

    this.wfMapService.patch();
    this.wfMapService.changeBasemapCacheToken();
    this.addCustomMaterialIcons();
    this.updateService.checkForUpdates();
    this.checkUserPermissions();

    if (!this.location.path().startsWith('/(root:external')) {
      this.appConfigService.configEmitter.subscribe((config) => {
        this.applicationConfig.version.short =
          config.application.version.replace(/-snapshot/i, '');
        this.applicationConfig.version.long = config.application.version;
        this.applicationConfig.environment =
          config.application.environment.replace(/^.*prod.*$/i, ' ') || ' ';
        this.onResize();
      });
    }
    this.tokenSubscription = this.tokenService.credentialsEmitter.subscribe(
      (creds) => {
        const first = creds.given_name || creds.givenName;
        const last = creds.family_name || creds.familyName;

        this.applicationConfig.userName = `${first} ${last}`;
      },
    );

    this.initAppMenu();
    this.initFooterMenu();

    window['SPLASH_SCREEN'].remove();
    if (localStorage.getItem('dontShowDisclaimer') !== 'true') {
      const dialogRef = this.dialog.open(DisclaimerDialogComponent, {
        autoFocus: false,
        width: '600px',
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result['dontShowAgain']) {
          localStorage.setItem('dontShowDisclaimer', 'true');
        } else {
          localStorage.removeItem('dontShowDisclaimer');
        }
      });
    }

    const mainApp = document.getElementById('main-app');
    if (mainApp) {
      setTimeout(() => {
        mainApp.classList.remove('menu-collapsed');
        mainApp.classList.add('menu-hidden');
        if (document.getElementsByTagName('wf-menu')[0]) {
          (
            document.getElementsByTagName('wf-menu')[0] as HTMLElement
          ).removeAttribute('style');
        }
      }, 200);
    }


    // This breaks desktop. Do not do this if not in mobile!!!
    // Also, we won't know which page people are coming in from, so forcing to
    // the landing page is a bad idea in general...
    if (isMobileView()) {
      this.capacitorService.initialized.then(() => {
        this.commonUtilityService.preloadGeolocation();
        //setTimeout(() => {
        //  this.zone.run(() => {
        //      this.router.navigate([ResourcesRoutes.LANDING])
        //  })
        //}, 1000);
      });

      this.capacitorService.locationNotifications.subscribe(
        (ev: LocationNotification) => {
          this.router.navigate([ResourcesRoutes.ACTIVEWILDFIREMAP], {
            queryParams: {
              ...ev,
              identify: true,
              notification: true,
              time: Date.now(),
            },
          });
        },
      );
    }

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.setDefaultMetaTags();
      });
  }

  setDefaultMetaTags() {
    const imageUrl = this.appConfigService.getConfig().application.baseUrl.toString() + 'assets/images/share-wildfire.png';
    this.titleService.setTitle('BC Wildfire Service');

    this.metaService.updateTag({ property: 'og:title', content: 'BC Wildfire Service' });
    this.metaService.updateTag({ property: 'og:image', content: imageUrl });
    this.metaService.updateTag({ property: 'og:site_name', content: 'BC Wildfire Service' });
    this.metaService.updateTag({ property: 'og:description', content: `BC Wildfire Service App` });
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:site', content: '@BCGovFireInfo' });
    this.metaService.updateTag({ property: 'twitter:image', content: imageUrl });
  }

  initializeDeepLinks() {
    // add listener to enable Capacitor deep links functionality
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('appUrlOpen: initializing: ', JSON.stringify(event));
      this.zone.run(() => {
        try {
          // remove https:// and http:// from baseUrl
          const domain = this.appConfigService.getConfig().application.baseUrl.replace(/^https?:\/\//i, '');

          // reject if event URL is invalid
          if (!event.url.includes(domain) && !domain.includes('localhost')) {
            console.log('appUrlOpen: returning from initializeDeepLinks function');
            return;
          }

          // form path from URL's path + query parameters
          const url = new URL(event.url);
          const path = url.pathname + url.search;

          // navigate to deep link
          if (path) {
            console.log('appUrlOpen appPath: ', path);
            this.router.navigateByUrl(path);
          }
        } catch (error) {
          console.error('appUrlOpen: error initializing deep links', error);
        }
      });
    });
  }

  isIncidentsPage() {
    return (
      window.location.pathname === '/incidents' ||
      window.location.pathname === '/reportOfFire'
    );
  }

  redirectToPublicMobile() {
    return (
      (window.innerWidth < 768 && window.innerHeight < 1024) ||
      (window.innerWidth < 1024 && window.innerHeight < 768)
    );
  }

  getAppStoreLink() {
    if (
      navigator.userAgent.toLowerCase().indexOf('iphone') > -1 ||
      navigator.userAgent.toLowerCase().indexOf('ipad') > -1
    ) {
      return this.appConfigService
        .getConfig()
        .externalAppConfig['appStoreUrl'].toString();
    } else {
      return this.appConfigService
        .getConfig()
        .externalAppConfig['googlePlayUrl'].toString();
    }
  }

  getAppStoreName() {
    if (
      navigator.userAgent.toLowerCase().indexOf('iphone') > -1 ||
      navigator.userAgent.toLowerCase().indexOf('ipad') > -1
    ) {
      return 'App Store';
    } else {
      return 'Google Play';
    }
  }

  download() {
    window.open(this.getAppStoreLink(), '_blank');
  }

  initAppMenu() {
    this.appMenu = [
      new RouterLink(
        'Dashboard',
        '/' + ResourcesRoutes.DASHBOARD,
        'bar_chart',
        'collapsed',
        this.router,
      ),
      new RouterLink(
        'Map View',
        '/' + ResourcesRoutes.ACTIVEWILDFIREMAP,
        'map',
        'collapsed',
        this.router,
      ),
      new RouterLink(
        'List View',
        '/' + ResourcesRoutes.WILDFIRESLIST,
        'local_fire_department',
        'collapsed',
        this.router,
      ),
      new RouterLink(
        'Saved',
        '/' + ResourcesRoutes.SAVED,
        'local_fire_department',
        'collapsed',
        this.router,
      ),
      new RouterLink(
        'Resources',
        '/' + ResourcesRoutes.RESOURCES,
        'links',
        'collapsed',
        this.router,
      ),
      new RouterLink(
        'Report a Fire',
        '/' + ResourcesRoutes.ROF,
        'links',
        'collapsed',
        this.router,
      ),
      new RouterLink(
        'Contact Us',
        '/' + ResourcesRoutes.CONTACT_US,
        'links',
        'collapsed',
        this.router,
      ),
    ] as unknown as WfMenuItems;
  }

  initFooterMenu() {
    this.footerMenu = (this.applicationConfig.device === 'desktop'
      ? [
        new RouterLink(
          'Home',
          'https://www2.gov.bc.ca/gov/content/home',
          'home',
          'expanded',
          this.router,
        ),
        new RouterLink(
          'Disclaimer',
          'https://www2.gov.bc.ca/gov/content?id=DE91907CDB3E4B5EB2F0363569079B85',
          'home',
          'expanded',
          this.router,
        ),
        new RouterLink(
          'Privacy',
          'https://www2.gov.bc.ca/gov/content/home/privacy',
          'home',
          'expanded',
          this.router,
        ),
        new RouterLink(
          'Accessibility',
          'https://www2.gov.bc.ca/gov/content/home/accessible-government',
          'home',
          'expanded',
          this.router,
        ),
        new RouterLink(
          'Copyright',
          'https://www2.gov.bc.ca/gov/content/home/copyright',
          'home',
          'expanded',
          this.router,
        ),
        new RouterLink(
          'Contact Us',
          'https://www2.gov.bc.ca/gov/content/home/get-help-with-government-services',
          'home',
          'expanded',
          this.router,
        ),
      ]
      : [
        new RouterLink('Home', '/', 'home', 'hidden', this.router),
      ]) as unknown as WfMenuItems;
  }

  ngAfterViewInit() {
    setInterval(() => {
      this.getLastSync();
    }, 1000);

    setTimeout(() => {
      const headerImg = document.getElementsByClassName('bc-logo');
      if (headerImg && headerImg[0]) {
        const node = document.createElement('span');
        node.style.color = '#fcba19';
        node.style.marginLeft = '20px';
        node.append(this.applicationConfig.environment);
        headerImg[0].appendChild(node);
      }
    }, 1000);
  }

  getLastSync() {
    if (!this.lastSyncDate) {
      return '-';
    }
    const now = moment();
    const value = now.diff(this.lastSyncDate, 'second', false);
    if (value > 240) {
      this.lastSyncValue = '240+';
    } else {
      this.lastSyncValue = value.toFixed(0);
    }
  }

  storeViewportSize() {
    this.orientation = this.applicationStateService.getOrientation();
    document.documentElement.style.setProperty(
      '--viewport-height',
      `${window.innerHeight}px`,
    );
    document.documentElement.style.setProperty(
      '--viewport-width',
      `${window.innerWidth}px`,
    );
  }

  ngOnDestroy() {
    if (this.lastSuccessPollSub) {
      this.lastSuccessPollSub.unsubscribe();
    }
    if (this.tokenSubscription) {
      this.tokenSubscription.unsubscribe();
    }
  }

  checkUserPermissions() {
    this.hasAccess = true;
    this.isLoggedIn = true;
  }

  navigateToBcWebsite() {
    window.open(
      'https://www2.gov.bc.ca/gov/content/safety/wildfire-status',
      '_blank',
    );
  }

  navigateToFooterPage(event: any) {
    window.open(event.route, '_blank');
  }

  addCustomMaterialIcons() {
    this.matIconRegistry.addSvgIcon(
      ICON.twitter,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/twitter.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.facebook,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/facebook.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.facebookSquare,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/facebook-square.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.fire,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/fire.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.exclamationCircle,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/exclamation-circle.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.mapSigns,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/map-signs.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.incident,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/incident.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.advisories,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/bullhorn.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.externalLink,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/external-link.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.cloudSun,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/cloud-sun.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.filterCancel,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/filter-cancel.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.bookmark,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/bookmark.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.map,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/map.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.mapHover,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/map-hover.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.backIcon,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/back-icon.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.dot,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/dot.svg',
      ),
    );

    this.matIconRegistry.addSvgIcon(
      ICON.contactUs,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/contact-us.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.camping,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/camping.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.larger,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/larger.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.phone,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/phone.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.arrowForwardEnabled,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/arrow-forward-enabled.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.arrowForwardDisabled,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/arrow-forward-disabled.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.camera,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/camera.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.image,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/image.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.cameraGrey,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/camera-grey.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.imageGrey,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/image-grey.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.edit,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/edit.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.send,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/send.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.locationOff,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/location-off.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.dashboard,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/dashboard.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.more,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/more.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.report,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/report.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.saved,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/saved.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.arrow,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/arrow.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.cancel,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/cancel.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.areaRestriction,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/area-restriction.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.ban,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/ban.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.fireDangerVeryLow,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/fire-danger-very-low.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.fireDangerLow,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/fire-danger-low.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.fireDangerModerate,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/fire-danger-moderate.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.fireDangerHigh,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/fire-danger-high.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.fireDangerExtreme,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/fire-danger-extreme.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.roadEvent,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/road-event.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.closedRecreationSite,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/closed-recreation-site.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.regionalDistricts,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/regional-districts.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.brownSquare,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/brown-square.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.indianReserve,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/indian-reserve.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.backIconPanel,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/back-icon-panel.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.fireNote,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/fire-note.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.locationDisabled,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/location-disabled.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.locationEnabled,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/location-enabled.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.calendar,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/calendar.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.zoomIn,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/zoom-in.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.arrowLeft,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/arrow-left.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.carbonCalendar,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/carbon_calendar.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.agency,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/carbon_finance.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.carbonGauge,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/carbon_gauge.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.carbonLayer,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/carbon_layers.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      ICON.launchWhite,
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/images/svg-icons/launch_white.svg',
      ),
    );
  }

  isAdminPage() {
    if (
      this.router.url === '/admin' ||
      this.router.url.includes('/incident?') ||
      this.router.url.includes('?preview=true') ||
      this.router.url === '/error-page'
    ) {
      return true;
    } else {
      return false;
    }
  }

  navigateToBcSupport() {
    const url = this.appConfigService
      .getConfig()
      .externalAppConfig['bcWildFireSupportPage'].toString();
    window.open(url, '_blank');
  }

  logOutCurrentUser() {
    setTimeout(() => {
      this.router.navigate([ResourcesRoutes.SIGN_OUT]);
    }, 100);
  }

  setActive(menuItem: string): void {
    this.activeMenuItem = menuItem;
    switch (menuItem) {
      case 'dashboard':
        this.router.navigate([ResourcesRoutes.DASHBOARD]);
        break;
      case 'map':
        this.router.navigate([ResourcesRoutes.ACTIVEWILDFIREMAP]);
        break;
      case 'reportOfFire':
        this.router.navigate([ResourcesRoutes.ROF]);
        break;
      case 'saved':
        this.router.navigate([ResourcesRoutes.SAVED]);
        break;
      case 'more':
        this.router.navigate([ResourcesRoutes.MORE]);
        break;
      default:
        this.router.navigate([ResourcesRoutes.DASHBOARD]);
    }
  }

  openLink(link: string) {
    if (link === 'Disclaimer') {
      window.open(
        'https://www2.gov.bc.ca/gov/content?id=DE91907CDB3E4B5EB2F0363569079B85',
        '_blank',
      );
    } else if (link === 'Privacy') {
      window.open('https://www2.gov.bc.ca/gov/content/home/privacy', '_blank');
    } else if (link === 'Copyright') {
      window.open(
        'https://www2.gov.bc.ca/gov/content/home/copyright',
        '_blank',
      );
    }
  }

  disclaimerText() {
    if (screen.width <= 1200) {
      return 'Legal';
    } else {
      return 'Disclaimer and Legal Links';
    }
  }

  private updateMapSize = function () {
    this.storeViewportSize();
  };

  private onSizeChange() {
    setTimeout(() => {
      this.updateMapSize();
      this.initAppMenu();
      this.initFooterMenu();
      this.cdr.detectChanges();

      // on resize, ensure the right main panel css is applied
      // Basically, we want mobile all the time on public and
      // desktop all the time on admin
      const classList = document.getElementById('main-app').classList;
      if (this.isAdminPage() && classList.contains('device-mobile')) {
        classList.remove('device-mobile');
        classList.add('device-desktop');
      } else if (
        !this.isAdminPage() &&
        this.applicationConfig.environment.toLowerCase() === '' &&
        classList.contains('device-desktop')
      ) {
        classList.remove('device-desktop');
        classList.add('device-mobile');
      }
    }, 250);
  }
}
