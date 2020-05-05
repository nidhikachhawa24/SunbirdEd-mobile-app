import {FormAndFrameworkUtilService} from './../../services/formandframeworkutil.service';
import {AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {combineLatest, Observable, Subscription} from 'rxjs';
import {delay, tap} from 'rxjs/operators';
import {ActivatedRoute, NavigationExtras, Router} from '@angular/router';
import {AppVersion} from '@ionic-native/app-version/ngx';
import {TranslateService} from '@ngx-translate/core';
import {FormControl, FormGroup} from '@angular/forms';
import {ProfileConstants, RouterLinks} from '@app/app/app.constant';
import {GUEST_STUDENT_TABS, GUEST_TEACHER_TABS, initTabs} from '@app/app/module.service';
import {Environment, ImpressionType, InteractSubtype, InteractType, PageId, CorReleationDataType} from '@app/services/telemetry-constants';
import {
  Framework,
  FrameworkCategoryCode,
  FrameworkCategoryCodesGroup,
  FrameworkService,
  FrameworkUtilService,
  GetFrameworkCategoryTermsRequest,
  GetSuggestedFrameworksRequest,
  Profile,
  ProfileService,
  ProfileType,
  CorrelationData,
  Rollup
} from 'sunbird-sdk';
import {
  AppGlobalService,
  AppHeaderService,
  CommonUtilService,
  ContainerService,
  SunbirdQRScanner,
  TelemetryGeneratorService
} from 'services';
import {AlertController, Events, Platform} from '@ionic/angular';
import {Location} from '@angular/common';
import {SplashScreenService} from '@app/services/splash-screen.service';
import {CachedItemRequestSourceFrom} from '@project-sunbird/sunbird-sdk';

@Component({
  selector: 'app-profile-settings',
  templateUrl: './profile-settings.page.html',
  styleUrls: ['./profile-settings.page.scss'],
})
export class ProfileSettingsPage implements OnInit, OnDestroy, AfterViewInit {
  public pageId = 'ProfileSettingsPage';
  @ViewChild('boardSelect') boardSelect: any;
  @ViewChild('mediumSelect') mediumSelect: any;
  @ViewChild('gradeSelect') gradeSelect: any;
  @ViewChild('animatedQRImage') animatedQRImageRef: ElementRef;

  private framework: Framework;
  private navParams: any;
  private activeSessionProfile?: Profile;
  private unregisterBackButton: Subscription;
  private headerObservable: any;
  private formControlSubscriptions: Subscription;
  loader: any;
  btnColor = '#8FC4FF';
  appName: string;
  showQRScanner = true;

  public profileSettingsForm: FormGroup;
  public hideBackButton = true;

  public syllabusList: { name: string, code: string }[] = [];
  public mediumList: { name: string, code: string }[] = [];
  public gradeList: { name: string, code: string }[] = [];

  boardOptions = {
    title: this.commonUtilService.translateMessage('BOARD_OPTION_TEXT'),
    cssClass: 'ftue-changes'
  };
  mediumOptions = {
    title: this.commonUtilService.translateMessage('MEDIUM_OPTION_TEXT'),
    cssClass: 'select-box'
  };
  classOptions = {
    title: this.commonUtilService.translateMessage('GRADE_OPTION_TEXT'),
    cssClass: 'select-box'
  };

  get syllabusControl(): FormControl {
    return this.profileSettingsForm.get('syllabus') as FormControl;
  }

  get boardControl(): FormControl {
    return this.profileSettingsForm.get('board') as FormControl;
  }

  get mediumControl(): FormControl {
    return this.profileSettingsForm.get('medium') as FormControl;
  }

  get gradeControl(): FormControl {
    return this.profileSettingsForm.get('grade') as FormControl;
  }

  constructor(
    @Inject('PROFILE_SERVICE') private profileService: ProfileService,
    @Inject('FRAMEWORK_SERVICE') private frameworkService: FrameworkService,
    @Inject('FRAMEWORK_UTIL_SERVICE') private frameworkUtilService: FrameworkUtilService,
    private formAndFrameworkUtilService: FormAndFrameworkUtilService,
    private translate: TranslateService,
    private telemetryGeneratorService: TelemetryGeneratorService,
    private appGlobalService: AppGlobalService,
    private events: Events,
    private scanner: SunbirdQRScanner,
    private platform: Platform,
    private commonUtilService: CommonUtilService,
    private container: ContainerService,
    private headerService: AppHeaderService,
    private router: Router,
    private appVersion: AppVersion,
    private alertCtrl: AlertController,
    private location: Location,
    private splashScreenService: SplashScreenService,
    private activatedRoute: ActivatedRoute
  ) {
    this.profileSettingsForm = new FormGroup({
      syllabus: new FormControl([], (c) => c.value.length ? undefined : { length: 'NOT_SELECTED' }),
      board: new FormControl([], (c) => c.value.length ? undefined : { length: 'NOT_SELECTED' }),
      medium: new FormControl([], (c) => c.value.length ? undefined : { length: 'NOT_SELECTED' }),
      grade: new FormControl([], (c) => c.value.length ? undefined : { length: 'NOT_SELECTED' })
    });
  }

  async ngOnInit() {

    /* New Telemetry */
    this.telemetryGeneratorService.generateImpressionTelemetry(
      ImpressionType.PAGE_REQUEST, '',
      PageId.SCAN_OR_MANUAL,
      Environment.ONBOARDING
    );

    this.handleActiveScanner();

    this.appVersion.getAppName().then((appName) => {
      this.appName = (appName).toUpperCase();
    });

    this.activeSessionProfile = await this.profileService.getActiveSessionProfile({
      requiredFields: ProfileConstants.REQUIRED_FIELDS
    }).toPromise();

    this.formControlSubscriptions = combineLatest(
      this.onSyllabusChange(),
      this.onMediumChange(),
      this.profileSettingsForm.valueChanges.pipe(
        delay(250),
        tap(() => {
          this.btnColor = this.profileSettingsForm.valid ? '#006DE5' : '#8FC4FF';
        })
      )
    ).subscribe();

    await this.fetchSyllabusList();

    /* New Telemetry */
    const correlationList: Array<CorrelationData> = [];
    correlationList.push({ id: this.syllabusList.length.toString(), type:  CorReleationDataType.BOARD_COUNT});
    this.telemetryGeneratorService.generatePageLoadedTelemetry(
      PageId.SCAN_OR_MANUAL,
      Environment.ONBOARDING,
      correlationList
    );
  }

  subscribeFormFieldValueChage() {
    this.profileSettingsForm.get('syllabus').valueChanges.subscribe(() => {
      alert('1');
    });
    this.profileSettingsForm.get('medium').valueChanges.subscribe(() => {
      alert('2');
    });
    this.profileSettingsForm.get('grade').valueChanges.subscribe(() => {
      alert('3');
    });
  }

  ngAfterViewInit() {
    plugins['webViewChecker'].getCurrentWebViewPackageInfo()
      .then((packageInfo) => {
        this.formAndFrameworkUtilService.getWebviewConfig().then((webviewVersion) => {
          if (parseInt(packageInfo.versionName.split('.')[0], 10) <= webviewVersion) {
            this.animatedQRImageRef.nativeElement.style.width =
            this.animatedQRImageRef.nativeElement.style.height = 'auto';
            this.animatedQRImageRef.nativeElement.style.minWidth =
            this.animatedQRImageRef.nativeElement.style.minHeight = 0;
          }
        }).catch(() => {
          if (parseInt(packageInfo.versionName.split('.')[0], 10) <= 54) {
            this.animatedQRImageRef.nativeElement.style.width =
            this.animatedQRImageRef.nativeElement.style.height = 'auto';
            this.animatedQRImageRef.nativeElement.style.minWidth =
            this.animatedQRImageRef.nativeElement.style.minHeight = 0;
          }
        });
      });
  }

  private redirectToInitialRoute() {
    const snapshot = this.activatedRoute.snapshot;
    if (snapshot.queryParams && snapshot.queryParams.reOnboard) {
      this.showQRScanner = false;
      const userTypeSelectionRoute = new URL(window.location.origin + `/${RouterLinks.USER_TYPE_SELECTION}`);
      const languageSettingRoute = new URL(window.location.origin + `/${RouterLinks.LANGUAGE_SETTING}`);

      userTypeSelectionRoute.searchParams.set('onReload', 'true');
      languageSettingRoute.searchParams.set('onReload', 'true');

      window.history.pushState({}, '', userTypeSelectionRoute.toString());
      window.history.pushState({}, '', languageSettingRoute.toString());
      this.hideBackButton = false;
    }
  }

  ngOnDestroy() {
    this.formControlSubscriptions.unsubscribe();
  }

  handleActiveScanner() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation && navigation.extras && navigation.extras.state) {
      this.navParams = navigation.extras.state;
    }

    if (this.navParams && this.navParams.stopScanner) {
      setTimeout(() => {
        this.scanner.stopScanner();
      }, 500);
    }
  }

  ionViewWillEnter() {
    if (this.router.url === '/' + RouterLinks.PROFILE_SETTINGS) {
      setTimeout(() => {
        this.telemetryGeneratorService.generateImpressionTelemetry(
            ImpressionType.VIEW, '',
            PageId.ONBOARDING_PROFILE_PREFERENCES,
            Environment.ONBOARDING
        );
      }, 350);
    }

    this.handleDeviceBackButton();
    // after qr scan if bmc is not populated then show only BMC
    if (history.state && history.state.showFrameworkCategoriesMenu) {
      this.showQRScanner = false;
    }
    this.headerObservable = this.headerService.headerEventEmitted$.subscribe(eventName => {
      this.handleHeaderEvents(eventName);
    });

    if (this.navParams) {
      this.hideBackButton = Boolean(this.navParams.hideBackButton);
    }

    // should be called everytime when entered to this page
    this.redirectToInitialRoute();
    this.headerService.hideHeader();
  }

  ionViewDidEnter() {
    this.hideOnboardingSplashScreen();
  }

  hideOnboardingSplashScreen() {
    if (this.navParams && this.navParams.forwardMigration) {
      this.splashScreenService.handleSunbirdSplashScreenActions();
    }
  }

  ionViewWillLeave() {
    this.headerObservable.unsubscribe();
    if (this.unregisterBackButton) {
      this.unregisterBackButton.unsubscribe();
    }
  }

  async dismissPopup() {
    const activePortal = await this.alertCtrl.getTop();

    if (activePortal) {
      activePortal.dismiss();
    } else {
      this.location.back();
    }
  }

  cancelEvent(category?: string) {
    this.telemetryGeneratorService.generateInteractTelemetry(InteractType.TOUCH,
      InteractSubtype.CANCEL_CLICKED,
      Environment.ONBOARDING,
      PageId.ONBOARDING_PROFILE_PREFERENCES,
      undefined
    );

    /* New Telemetry */
    const correlationList: Array<CorrelationData> = [];
    let correlationData: CorrelationData = new CorrelationData();
    switch(category) {
      case 'board':
        correlationData.id = this.syllabusControl.value;
        correlationData.type = CorReleationDataType.BOARD;
        break;
      case 'medium':
        correlationData.id = this.mediumControl.value;
        correlationData.type = CorReleationDataType.MEDIUM;
        break;
      case 'grade':
        correlationData.id = this.gradeControl.value;
        correlationData.type = CorReleationDataType.CLASS;
        break;
    }
    correlationList.push(correlationData);
    const rollUpObj: Rollup = new Rollup();
    rollUpObj.l1 = PageId.PROFILE_SETTINGS;
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.SELECT_CANCEL, '',
      Environment.ONBOARDING,
      PageId.POPUP_CATEGORY,
      undefined,
      undefined,
      rollUpObj,
      correlationList
    );
  }

  extractProfileForTelemetry(formVal): any {
    const profileReq: any = {};
    profileReq.board = formVal.syllabus;
    profileReq.medium = formVal.medium;
    profileReq.grade = formVal.grades;
    return profileReq;
  }

  handleDeviceBackButton() {
    this.unregisterBackButton = this.platform.backButton.subscribeWithPriority(10, () => {
      this.handleBackButton(false);
    });
  }

  handleHeaderEvents($event) {
    switch ($event.name) {
      case 'back':
        this.handleBackButton(true);
        break;
    }
  }

  handleBackButton(isNavBack) {
    this.telemetryGeneratorService.generateBackClickedTelemetry(PageId.ONBOARDING_PROFILE_PREFERENCES, Environment.ONBOARDING, isNavBack);
    /* New Telemetry */
    this.telemetryGeneratorService.generateBackClickedNewTelemetry(
      !isNavBack,
      Environment.ONBOARDING,
      this.showQRScanner ? PageId.SCAN_OR_MANUAL : PageId.PROFILE_SETTINGS
    );

    if (this.showQRScanner === false) {
      this.showQRScanner = true;
      this.resetProfileSettingsForm();
    } else {
      this.dismissPopup();
    }
  }

  openQRScanner() {
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.QRCodeScanClicked,
      Environment.ONBOARDING,
      PageId.ONBOARDING_PROFILE_PREFERENCES,
    );
    /* New Telemetry */
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.SELECT_QRSCANER, '',
      Environment.ONBOARDING,
      PageId.SCAN_OR_MANUAL
    );
    this.scanner.startScanner(PageId.ONBOARDING_PROFILE_PREFERENCES, true).then((scannedData) => {
      if (scannedData === 'skip') {
        this.telemetryGeneratorService.generateImpressionTelemetry(
          ImpressionType.VIEW, '',
          PageId.ONBOARDING_PROFILE_PREFERENCES,
          Environment.ONBOARDING
        );
        this.showQRScanner = false;

        this.resetProfileSettingsForm();
      }
    });
  }

  onSubmitAttempt() {
    if (this.profileSettingsForm.valid) {
      this.appGlobalService.generateSaveClickedTelemetry(this.extractProfileForTelemetry(this.profileSettingsForm.value), 'passed',
        PageId.ONBOARDING_PROFILE_PREFERENCES, InteractSubtype.FINISH_CLICKED);
      /* New Telemetry */
      const correlationList: Array<CorrelationData> = [];
      correlationList.push({ id: this.syllabusControl.value, type: CorReleationDataType.BOARD });
      correlationList.push({ id: this.mediumControl.value, type: CorReleationDataType.MEDIUM });
      correlationList.push({ id: this.gradeControl.value, type: CorReleationDataType.BOARD });
      this.telemetryGeneratorService.generateInteractTelemetry(
        InteractType.SELECT_SUBMIT, '',
        Environment.ONBOARDING,
        PageId.PROFILE_SETTINGS,
        undefined,
        undefined,
        undefined,
        correlationList
      );
      this.submitProfileSettingsForm();
      return;
    }

    for (const [control, selector] of [
      [this.syllabusControl, this.boardSelect],
      [this.mediumControl, this.mediumSelect],
      [this.gradeControl, this.gradeSelect]
    ]) {
      if (!control.value.length) {
        if (!this.profileSettingsForm.value.board.length) {
          this.appGlobalService.generateSaveClickedTelemetry(this.extractProfileForTelemetry(this.profileSettingsForm.value), 'failed',
            PageId.ONBOARDING_PROFILE_PREFERENCES, InteractSubtype.FINISH_CLICKED);
          const values = new Map();
          values['board'] = 'na';
          this.telemetryGeneratorService.generateInteractTelemetry(
            InteractType.TOUCH,
            'submit-clicked',
            Environment.HOME,
            PageId.ONBOARDING_PROFILE_PREFERENCES,
            undefined,
            values
          );
        } else if (!this.profileSettingsForm.value.medium.length) {
          this.appGlobalService.generateSaveClickedTelemetry(this.extractProfileForTelemetry(this.profileSettingsForm.value), 'failed',
            PageId.ONBOARDING_PROFILE_PREFERENCES, InteractSubtype.FINISH_CLICKED);
          const values = new Map();
          values['medium'] = 'na';
          this.telemetryGeneratorService.generateInteractTelemetry(
            InteractType.TOUCH,
            'submit-clicked',
            Environment.HOME,
            PageId.ONBOARDING_PROFILE_PREFERENCES,
            undefined,
            values
          );
        } else if (!this.profileSettingsForm.value.grade.length) {
          this.appGlobalService.generateSaveClickedTelemetry(this.extractProfileForTelemetry(this.profileSettingsForm.value), 'failed',
            PageId.ONBOARDING_PROFILE_PREFERENCES, InteractSubtype.FINISH_CLICKED);
          const values = new Map();
          values['grades'] = 'na';
          this.telemetryGeneratorService.generateInteractTelemetry(
            InteractType.TOUCH,
            'submit-clicked',
            Environment.HOME,
            PageId.ONBOARDING_PROFILE_PREFERENCES,
            undefined,
            values
          );
        }
        selector.open();
        return;
      }
    }
  }

  async fetchSyllabusList() {
    this.loader = await this.commonUtilService.getLoader();
    await this.loader.present();

    const getSuggestedFrameworksRequest: GetSuggestedFrameworksRequest = {
      from: CachedItemRequestSourceFrom.SERVER,
      language: this.translate.currentLang,
      requiredCategories: FrameworkCategoryCodesGroup.DEFAULT_FRAMEWORK_CATEGORIES
    };

    this.frameworkUtilService.getActiveChannelSuggestedFrameworkList(getSuggestedFrameworksRequest).toPromise()
      .then(async (frameworks: Framework[]) => {
        if (!frameworks || !frameworks.length) {
          await this.loader.dismiss();
          this.commonUtilService.showToast('NO_DATA_FOUND');
          return;
        }
        this.syllabusList = frameworks.map(r => ({ name: r.name, code: r.identifier }));
        await this.loader.dismiss();
      });
  }

  private onSyllabusChange(): Observable<string[]> {
    return this.syllabusControl.valueChanges.pipe(
      tap(async (value) => {
        if (!Array.isArray(value)) {
          this.syllabusControl.patchValue([value]);
          return;
        }

        if (!value.length) {
          return;
        }

        await this.commonUtilService.getLoader().then((loader) => {
          this.loader = loader;
          this.loader.present();
        });

        try {
          this.framework = await this.frameworkService.getFrameworkDetails({
            from: CachedItemRequestSourceFrom.SERVER,
            frameworkId: value[0],
            requiredCategories: FrameworkCategoryCodesGroup.DEFAULT_FRAMEWORK_CATEGORIES
          }).toPromise();

          /* New Telemetry */
          this.generateCategorySubmitTelemetry('board');

          const boardCategoryTermsRequet: GetFrameworkCategoryTermsRequest = {
            frameworkId: this.framework.identifier,
            requiredCategories: [FrameworkCategoryCode.BOARD],
            currentCategoryCode: FrameworkCategoryCode.BOARD,
            language: this.translate.currentLang
          };

          const boardTerm = (await this.frameworkUtilService.getFrameworkCategoryTerms(boardCategoryTermsRequet).toPromise())
            .find(b => b.name === (this.syllabusList.find((s) => s.code === value[0])!.name));

          this.boardControl.patchValue([boardTerm.code]);

          const nextCategoryTermsRequet: GetFrameworkCategoryTermsRequest = {
            frameworkId: this.framework.identifier,
            requiredCategories: [FrameworkCategoryCode.MEDIUM],
            prevCategoryCode: FrameworkCategoryCode.BOARD,
            currentCategoryCode: FrameworkCategoryCode.MEDIUM,
            language: this.translate.currentLang,
            selectedTermsCodes: this.boardControl.value
          };

          this.mediumList = (await this.frameworkUtilService.getFrameworkCategoryTerms(nextCategoryTermsRequet).toPromise())
            .map(t => ({ name: t.name, code: t.code }));

        } catch (e) {
          // todo
          console.error(e);
        } finally {
          // todo
          this.mediumControl.patchValue([]);
          this.loader.dismiss();
        }
      })
    );
  }

  private onMediumChange(): Observable<string[]> {
    return this.mediumControl.valueChanges.pipe(
      tap(async () => {

        /* New Telemetry */
        this.generateCategorySubmitTelemetry('medium');

        await this.commonUtilService.getLoader().then((loader) => {
          this.loader = loader;
          this.loader.present();
        });

        try {
          const nextCategoryTermsRequet: GetFrameworkCategoryTermsRequest = {
            frameworkId: this.framework.identifier,
            requiredCategories: [FrameworkCategoryCode.GRADE_LEVEL],
            prevCategoryCode: FrameworkCategoryCode.MEDIUM,
            currentCategoryCode: FrameworkCategoryCode.GRADE_LEVEL,
            language: this.translate.currentLang,
            selectedTermsCodes: this.mediumControl.value
          };

          this.gradeList = (await this.frameworkUtilService.getFrameworkCategoryTerms(nextCategoryTermsRequet).toPromise())
            .map(t => ({ name: t.name, code: t.code }));

        } catch (e) {
          // todo
          console.error(e);
        } finally {
          // todo
          this.gradeControl.patchValue([]);
          this.loader.dismiss();
        }
      })
    );
  }

  private onGradeChange(): Observable<string[]> {
    return this.gradeControl.valueChanges.pipe(
      tap(async () => {

        /* New Telemetry */
        this.generateCategorySubmitTelemetry('grade');

      })
    );
  }

  private async submitProfileSettingsForm() {
    await this.commonUtilService.getLoader().then((loader) => {
      this.loader = loader;
    });
    const updateProfileRequest: Profile = {
      ...this.activeSessionProfile,
      syllabus: this.syllabusControl.value,
      board: this.boardControl.value,
      medium: this.mediumControl.value,
      grade: this.gradeControl.value,
      profileType: (this.navParams && this.navParams.selectedUserType) || this.activeSessionProfile.profileType
    };

    this.profileService.updateProfile(updateProfileRequest).toPromise()
      .then(async (profile: Profile) => {
        if (this.commonUtilService.isAccessibleForNonStudentRole(updateProfileRequest.profileType)) {
          initTabs(this.container, GUEST_TEACHER_TABS);
        } else if (updateProfileRequest.profileType === ProfileType.STUDENT) {
          initTabs(this.container, GUEST_STUDENT_TABS);
        }
        this.events.publish('refresh:profile');
        this.appGlobalService.guestUserProfile = profile;
        await this.commonUtilService.handleToTopicBasedNotification();
        setTimeout(async () => {
          this.commonUtilService.showToast('PROFILE_UPDATE_SUCCESS');
          if (await this.commonUtilService.isDeviceLocationAvailable()) {
            this.appGlobalService.setOnBoardingCompleted();
            this.router.navigate([`/${RouterLinks.TABS}`]);
          } else {
            const navigationExtras: NavigationExtras = {
              state: {
                isShowBackButton: true
              }
            };
            this.router.navigate([RouterLinks.DISTRICT_MAPPING], navigationExtras);
          }
        }, 2000);
        this.events.publish('onboarding-card:completed', { isOnBoardingCardCompleted: true });
        this.events.publish('refresh:profile');
        this.appGlobalService.guestUserProfile = profile;

        this.telemetryGeneratorService.generateProfilePopulatedTelemetry(
          PageId.ONBOARDING_PROFILE_PREFERENCES, profile, 'manual', Environment.ONBOARDING
        );
        this.loader = await this.commonUtilService.getLoader(2000);
        await this.loader.present();
      })
      .catch(async () => {
        // todo
        await this.loader.dismiss();
        this.commonUtilService.showToast('PROFILE_UPDATE_FAILED');
      });
  }

  generateProfileSetTelemetry() {
    /* New Telemetry */
    const correlationList: Array<CorrelationData> = [];
    correlationList.push({ id: this.syllabusControl.value, type: CorReleationDataType.BOARD });
    correlationList.push({ id: this.mediumControl.value, type: CorReleationDataType.MEDIUM });
    correlationList.push({ id: this.gradeControl.value, type: CorReleationDataType.BOARD });
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.SELECT_SUBMIT, '',
      Environment.ONBOARDING,
      PageId.PROFILE_SETTINGS,
      undefined,
      undefined,
      undefined,
      correlationList
    );
  }

  private resetProfileSettingsForm() {
    this.profileSettingsForm.reset({
      syllabus: [],
      board: [],
      medium: [],
      grade: []
    });
  }

  boardClicked(e?: Event) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    this.showQRScanner = false;

    /* New Telemetry */
    this.telemetryGeneratorService.generatePageLoadedTelemetry(
      PageId.PROFILE_SETTINGS,
      Environment.ONBOARDING
    );
    
    const correlationList: Array<CorrelationData> = [];
    correlationList.push({ id: this.syllabusList.length.toString(), type:  CorReleationDataType.BOARD_COUNT});
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.SELECT_CATEGORY, '',
      Environment.ONBOARDING,
      PageId.SCAN_OR_MANUAL,
      undefined,
      undefined,
      undefined,
      correlationList
    );

    setTimeout(() => {
      this.boardSelect.open();
    }, 0);
  }

  onCategoryCliked(category: string) {
    const correlationList: Array<CorrelationData> = [];
    let correlationData: CorrelationData = new CorrelationData();
    switch(category) {
      case 'board':
        correlationData.id = this.syllabusList.length.toString();
        correlationData.type = CorReleationDataType.BOARD_COUNT;
        break;
      case 'medium':
        correlationData.id = this.mediumList.length.toString();
        correlationData.type = CorReleationDataType.MEDIUM_COUNT;
        break;
      case 'grade':
        correlationData.id = this.gradeList.length.toString();
        correlationData.type = CorReleationDataType.CLASS_COUNT;
        break;
    }
    correlationList.push(correlationData);
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.SELECT_CATEGORY, '',
      Environment.ONBOARDING,
      PageId.PROFILE_SETTINGS,
      undefined,
      undefined,
      undefined,
      correlationList
    );
  }

  generateCategorySubmitTelemetry(category: string) {
    const correlationList: Array<CorrelationData> = [];
    let correlationData: CorrelationData = new CorrelationData();
    switch(category) {
      case 'board':
        correlationData.id = this.syllabusControl.value;
        correlationData.type = CorReleationDataType.BOARD;
        break;
      case 'medium':
        correlationData.id = this.mediumControl.value;
        correlationData.type = CorReleationDataType.MEDIUM;
        break;
      case 'grade':
        correlationData.id = this.gradeControl.value;
        correlationData.type = CorReleationDataType.CLASS;
        break;
    }
    correlationList.push(correlationData);
    const rollUpObj: Rollup = new Rollup();
    rollUpObj.l1 = PageId.PROFILE_SETTINGS;
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.SELECT_SUBMIT, '',
      Environment.ONBOARDING,
      PageId.POPUP_CATEGORY,
      undefined,
      undefined,
      rollUpObj,
      correlationList
    );
  }
}
