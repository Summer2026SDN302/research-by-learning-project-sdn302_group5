import { WeatherService } from '../services/weather.service';

describe('WeatherService alert detection', () => {
  it('creates a critical heat alert when temperature is far above the threshold', () => {
    const alerts = WeatherService.checkThresholds({
      temp: 45,
      humidity: 35,
      windSpeed: 10,
      description: 'Nắng nóng',
      icon: '01d',
    });

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'extreme_heat',
          severity: 'critical',
        }),
      ])
    );
  });
});
