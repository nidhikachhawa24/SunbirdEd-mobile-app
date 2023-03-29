import {Component, Inject, Input} from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { AppGlobalService } from '@app/services/app-global-service.service';
import { PageId } from '@app/services/telemetry-constants';
import { CommonUtilService } from '@app/services/common-util.service';
import { PreferenceKey, ProfileConstants } from '@app/app/app.constant';
import {
  CachedItemRequestSourceFrom, ProfileService,
  ServerProfileDetailsRequest,
  SharedPreferences
} from '@project-sunbird/sunbird-sdk';
import { NavigationService } from '@app/services/navigation-handler.service';

@Component({
  selector: 'app-profile-name-confirmation-popover',
  templateUrl: './sb-profile-name-confirmation-popup.component.html',
  styleUrls: ['./sb-profile-name-confirmation-popup.component.scss'],
})
export class ProfileNameConfirmationPopoverComponent {
  @Input() content;
  @Input() projectContent;
  appName;
  profile;
  doNotShowAgain = false;
  buttonLabel ="START_LEARNING";

  constructor(
    @Inject('PROFILE_SERVICE') private profileService: ProfileService,
    @Inject('SHARED_PREFERENCES') private preferences: SharedPreferences,
    private popoverCtrl: PopoverController,
    private navService: NavigationService,
    private appGlobalService: AppGlobalService,
    private commonUtilService: CommonUtilService
  ) { }

  async ionViewWillEnter() {
    this.buttonLabel = this.projectContent ? "FRMELEMNTS_LBL_START_IMPROVEMENT" : "START_LEARNING";
    this.commonUtilService.getAppName().then((res) => { this.appName = res; });

    const userId = await this.appGlobalService.getActiveProfileUid();

    const serverProfileDetailsRequest: ServerProfileDetailsRequest = {
      userId,
      requiredFields: ProfileConstants.REQUIRED_FIELDS,
      from: CachedItemRequestSourceFrom.SERVER
    };
    this.profileService.getServerProfilesDetails(serverProfileDetailsRequest).toPromise()
      .then((profileData) => {
        this.profile = profileData;
      })
      .catch(err => {
        console.error('ProfileNameConfirmationPopoverComponent', err);
      });
  }

  onSubmitClick() {
    const key = PreferenceKey.DO_NOT_SHOW_PROFILE_NAME_CONFIRMATION_POPUP + '-' + this.profile.userId;
    this.preferences.putBoolean(key, this.doNotShowAgain).toPromise().then();
    this.closePopover({ buttonClicked: true });
  }

  closePopover(data?) {
    this.popoverCtrl.dismiss(data);
  }

  onProfilePageClick() {
    let payload = this.projectContent ? {code:'name',children:[]} : ''
    this.navService.navigateToEditPersonalDetails(this.profile, PageId.PROFILE_NAME_CONFIRMATION_POPUP,payload);
    this.closePopover({ editProfileClicked: true });
  }

}
