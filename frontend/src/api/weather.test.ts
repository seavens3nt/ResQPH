import { afterEach,expect,it,vi } from 'vitest'
import { apiClient } from './client'
import { getUbeltWeather, getUbeltHourlyWeather } from './weather'
afterEach(()=>vi.restoreAllMocks())
it('validates and rounds server weather',async()=>{
  vi.spyOn(apiClient,'get').mockResolvedValue({data:{temperature:29.4,high:31.2,low:25.1,condition:'Rain',kind:'rain',time:'2026-10-10T04:00:00Z',feelsLike:33.5,windSpeed:8.2,rainChance:10,rainAmount:0.3}})
  expect(await getUbeltWeather()).toMatchObject({temperature:29,high:31,low:25,condition:'Rain',feelsLike:33.5,windSpeed:8.2,rainChance:10,rainAmount:0.3})
  expect(apiClient.get).toHaveBeenCalledWith('/weather/ubelt',{signal:undefined})
})

const hour={time:'2026-10-10T04:00:00Z',endTime:'2026-10-10T05:00:00Z',temperature:29,
  condition:'Light rain',kind:'rain',isDaytime:true,rainChance:40,rainAmount:0.3,windSpeed:5,humidity:80,pressure:1010}
it('validates live hourly data without changing precipitation units or intervals',async()=>{
  vi.spyOn(apiClient,'get').mockResolvedValue({data:[hour]})
  expect(await getUbeltHourlyWeather()).toEqual([hour])
  expect(apiClient.get).toHaveBeenCalledWith('/weather/ubelt/hourly',{signal:undefined})
})
it('retains absent hourly measurements as null and rejects invalid/empty data',async()=>{
  vi.spyOn(apiClient,'get').mockResolvedValueOnce({data:[{...hour,rainChance:null,rainAmount:null,windSpeed:null,humidity:null,pressure:null,isDaytime:null}]}).mockResolvedValueOnce({data:[]}).mockResolvedValueOnce({data:[{...hour,rainChance:101}]})
  expect((await getUbeltHourlyWeather())[0].rainAmount).toBeNull()
  await expect(getUbeltHourlyWeather()).rejects.toThrow()
  await expect(getUbeltHourlyWeather()).rejects.toThrow()
})
it('rejects malformed data and provider failure, without demo fallbacks',async()=>{
  vi.spyOn(apiClient,'get').mockResolvedValueOnce({data:{temperature:null}}).mockRejectedValueOnce(new Error('Unavailable'))
  await expect(getUbeltWeather()).rejects.toThrow()
  await expect(getUbeltWeather()).rejects.toThrow('Unavailable')
})
