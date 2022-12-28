import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationExtras, Resolve, Router } from '@angular/router';
import { PreferenceKey } from '@app/app/app.constant';
import { SplashScreenService } from '@app/services/splash-screen.service';
import { SharedPreferences } from 'sunbird-sdk';
import { LoginHandlerService } from '../services';
import { Location } from '@angular/common';

@Injectable()
export class HasNotSelectedLanguageGuard implements Resolve<any> {
    private guardActivated: boolean;
    skipNavigation: any;
    constructor(
        @Inject('SHARED_PREFERENCES') private sharedPreferences: SharedPreferences,
        private router: Router,
        private splashScreenService: SplashScreenService,
        private loginHandlerService: LoginHandlerService,
        private location: Location,
    ) {
      const extrasData = this.router.getCurrentNavigation().extras.state;
      this.skipNavigation = extrasData;
    }

    resolve(route: ActivatedRouteSnapshot): any {
        if (route.queryParams.onReload === 'true') {
            this.guardActivated = true;
        }

        if (this.guardActivated) {
            return true;
        }

        this.guardActivated = true;
        this.sharedPreferences.getString(PreferenceKey.SELECTED_LANGUAGE_CODE).toPromise().then((selectedLanguage) => {
            if (selectedLanguage) {
                const navigationExtras: NavigationExtras = {
                    state: {
                        forwardMigration: true
                    }
                };
                this.router.navigate(['/', 'user-type-selection'], navigationExtras);
//                 this.loginWithKeyCloak();
            } else {
                this.splashScreenService.handleSunbirdSplashScreenActions();
                return true;
            }
        });
    }

  loginWithKeyCloak() {
    this.loginHandlerService.signIn(this.skipNavigation).then(() => {
      this.navigateBack(this.skipNavigation);
    });
  }

  private navigateBack(skipNavigation) {
    if ((skipNavigation && skipNavigation.navigateToCourse) ||
      (skipNavigation && (skipNavigation.source === 'user' ||
      skipNavigation.source === 'resources'))) {
        this.location.back();
    }
  }
}
